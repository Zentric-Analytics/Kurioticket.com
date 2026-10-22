import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isProtectedAdminEmail } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { lockVisitorAccount } from "@/services/visitorActivityIdentity";
import { retireAccountVisitors } from "@/services/visitorAccountRetirement";

export type AccountDeletionFinalizationCode =
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "GRACE_PERIOD_ACTIVE"
  | "ADMIN_BLOCKED"
  | "ACCOUNT_CHANGED"
  | "CONFIRMATION_MISMATCH"
  | "REVIEW_REQUIRED";

export class AccountDeletionFinalizationError extends Error {
  constructor(public readonly code: AccountDeletionFinalizationCode, message: string) {
    super(message);
    this.name = "AccountDeletionFinalizationError";
  }
}

export type AccountDeletionCleanupCounts = {
  visitorsRetired: number;
  verificationTokensDeleted: number;
  authAccountsDeleted: number;
  webSessionsDeleted: number;
  accountSessionsDeleted: number;
  securityEventsDeleted: number;
  passkeysDeleted: number;
  webAuthnChallengesDeleted: number;
  mobileLoginChallengesDeleted: number;
  profileDeleted: number;
  securitySettingsDeleted: number;
  customizationPreferencesDeleted: number;
  travelPreferencesDeleted: number;
  savedFlightsDeleted: number;
  savedHotelsDeleted: number;
  savedCarsDeleted: number;
  savedSearchesDeleted: number;
  recentSearchesDeleted: number;
  priceAlertsDeleted: number;
  notificationsDeleted: number;
  tripsDeleted: number;
  newsletterSubscribersAnonymized: number;
  supportTicketsDetached: number;
  searchHistoryDetached: number;
  redirectLogsDetached: number;
  analyticsEventsDetached: number;
  previewAdminReferencesCleared: number;
  identityLinksDeleted: number;
  deletionRequestsRedacted: number;
};

export type FinalizeAccountDeletionInput = {
  requestId: string;
  confirmedEmail: string;
  reviewNotes: string;
  adminReference: string;
  retentionReviewed: boolean;
  now?: Date;
};

type FinalizerDependencies = {
  database: () => PrismaClient;
  protectedAdminEmail: (email: string | null | undefined) => boolean;
};

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

export function redactedDeletionEmail(requestId: string) {
  return `deleted-${requestId}@redacted.invalid`;
}

export function createAccountDeletionFinalizer(dependencies: FinalizerDependencies) {
  return async function finalizeAccountDeletion(input: FinalizeAccountDeletionInput) {
    const db = dependencies.database();
    const now = input.now ?? new Date();
    const reviewNotes = input.reviewNotes.trim();
    const adminReference = input.adminReference.trim();

    if (!input.retentionReviewed || !reviewNotes || !adminReference) {
      throw new AccountDeletionFinalizationError(
        "REVIEW_REQUIRED",
        "Retention review notes, an admin reference, and explicit retention confirmation are required.",
      );
    }

    return db.$transaction(async (tx) => {
      const initial = await tx.accountDeletionRequest.findUnique({
        where: { id: input.requestId },
        select: { id: true, userId: true },
      });
      if (!initial) {
        throw new AccountDeletionFinalizationError("NOT_FOUND", "Deletion request not found.");
      }

      // Use the same account lifecycle lock as visitor attribution and
      // self-service reactivation. This serializes finalization against both.
      const account = await lockVisitorAccount(tx, initial.userId);
      if (!account) {
        throw new AccountDeletionFinalizationError("ACCOUNT_CHANGED", "The account no longer exists.");
      }

      await tx.$queryRaw`SELECT "id" FROM "AccountDeletionRequest" WHERE "id" = ${input.requestId} FOR UPDATE`;
      const request = await tx.accountDeletionRequest.findUnique({
        where: { id: input.requestId },
        include: { user: { select: { id: true, email: true, role: true, status: true } } },
      });
      if (!request) {
        throw new AccountDeletionFinalizationError("NOT_FOUND", "Deletion request not found.");
      }
      if (request.status !== "READY_FOR_REVIEW" || request.cancelledAt || request.completedAt) {
        throw new AccountDeletionFinalizationError("INVALID_STATUS", "Only ready-for-review requests can be finalized.");
      }
      if (request.deletionScheduledAt.getTime() > now.getTime()) {
        throw new AccountDeletionFinalizationError("GRACE_PERIOD_ACTIVE", "The deletion grace period has not ended.");
      }
      if (
        request.user.id !== account.id ||
        request.user.role === "ADMIN" ||
        dependencies.protectedAdminEmail(request.user.email)
      ) {
        throw new AccountDeletionFinalizationError("ADMIN_BLOCKED", "This account cannot be finalized through the deletion workflow.");
      }
      if (request.user.status !== "PENDING_DELETION" && request.user.status !== "DELETED") {
        throw new AccountDeletionFinalizationError("ACCOUNT_CHANGED", "The account changed and must be reviewed again.");
      }

      const originalEmail = request.user.email?.trim() || request.email.trim();
      if (!originalEmail || normalized(input.confirmedEmail) !== normalized(originalEmail)) {
        throw new AccountDeletionFinalizationError("CONFIRMATION_MISMATCH", "Type the account email to confirm finalization.");
      }

      // The deletion request itself is a retained lifecycle record and has an
      // ON DELETE RESTRICT relationship to User. Keep a non-login tombstone
      // User row and remove/anonymize the personal account surface instead.
      await tx.user.update({
        where: { id: request.userId },
        data: {
          name: null,
          email: null,
          emailVerified: null,
          image: null,
          passwordHash: null,
          role: "USER",
          status: "DELETED",
          priceAlertLimitOverride: null,
          onboardedAt: null,
          sessionVersion: { increment: 1 },
        },
      });

      // Retire consented visitor credentials before removing the user
      // attribution from retained operational activity.
      const { visitorsRetired } = await retireAccountVisitors(tx, request.userId, now);
      const redactedEmail = redactedDeletionEmail(request.id);

      const supportTickets = await tx.supportTicket.updateMany({
        where: { userId: request.userId },
        data: { userId: null, email: redactedEmail },
      });
      const searchHistory = await tx.searchHistory.updateMany({
        where: { userId: request.userId },
        data: { userId: null },
      });
      const redirectLogs = await tx.redirectLog.updateMany({
        where: { userId: request.userId },
        data: { userId: null },
      });
      const analyticsEvents = await tx.analyticsEvent.updateMany({
        where: { userId: request.userId },
        data: { userId: null },
      });

      const previewApproved = await tx.previewTester.updateMany({
        where: { approvedByAdminId: request.userId },
        data: { approvedByAdminId: null },
      });
      const previewSuspended = await tx.previewTester.updateMany({
        where: { suspendedByAdminId: request.userId },
        data: { suspendedByAdminId: null },
      });
      const previewRevoked = await tx.previewTester.updateMany({
        where: { revokedByAdminId: request.userId },
        data: { revokedByAdminId: null },
      });

      // Stop marketing tied to the account email while preserving a redacted
      // consent lifecycle row for audit purposes.
      const newsletterSubscribers = await tx.newsletterSubscriber.updateMany({
        where: { email: normalized(originalEmail) },
        data: {
          email: redactedEmail,
          status: "UNSUBSCRIBED",
          source: null,
          locale: null,
          regionCode: null,
          ipHash: null,
          userAgent: null,
          unsubscribedAt: now,
          unsubscribeTokenHash: null,
        },
      });

      // Delete account-owned product/preferences/authentication data. Deletion
      // order mirrors FK dependencies where required.
      const priceAlerts = await tx.priceAlert.deleteMany({ where: { userId: request.userId } });
      const savedSearches = await tx.savedSearch.deleteMany({ where: { userId: request.userId } });
      const savedFlights = await tx.savedFlight.deleteMany({ where: { userId: request.userId } });
      const savedHotels = await tx.savedHotel.deleteMany({ where: { userId: request.userId } });
      const savedCars = await tx.savedCar.deleteMany({ where: { userId: request.userId } });
      const recentSearches = await tx.recentSearch.deleteMany({ where: { userId: request.userId } });
      const notifications = await tx.notification.deleteMany({ where: { userId: request.userId } });
      const trips = await tx.myTrip.deleteMany({ where: { userId: request.userId } });

      const securityEvents = await tx.securityEvent.deleteMany({ where: { userId: request.userId } });
      const accountSessions = await tx.accountSession.deleteMany({ where: { userId: request.userId } });
      const passkeys = await tx.userPasskey.deleteMany({ where: { userId: request.userId } });
      const webAuthnChallenges = await tx.webAuthnChallenge.deleteMany({ where: { userId: request.userId } });
      const mobileLoginChallenges = await tx.mobileLoginChallenge.deleteMany({ where: { userId: request.userId } });
      const securitySettings = await tx.userSecuritySettings.deleteMany({ where: { userId: request.userId } });
      const profile = await tx.userProfile.deleteMany({ where: { userId: request.userId } });
      const customizationPreferences = await tx.userCustomizationPreferences.deleteMany({ where: { userId: request.userId } });
      const travelPreferences = await tx.travelPreferences.deleteMany({ where: { userId: request.userId } });

      const authAccounts = await tx.account.deleteMany({ where: { userId: request.userId } });
      const webSessions = await tx.session.deleteMany({ where: { userId: request.userId } });
      const identityLinks = await tx.visitorIdentityLink.deleteMany({ where: { userId: request.userId } });

      const verificationTokens = await tx.verificationToken.deleteMany({
        where: {
          OR: [
            { identifier: `password-reset:${normalized(originalEmail)}` },
            { identifier: `email-verification:${normalized(originalEmail)}` },
            { identifier: `login-verification:${normalized(originalEmail)}` },
            { identifier: `mobile-verified:${normalized(originalEmail)}` },
            { identifier: `two-factor:totp-setup:${request.userId}` },
            { identifier: `mobile-password-reset:${request.userId}` },
            { identifier: `mobile-password-change-failure:${request.userId}` },
            { identifier: `passkey-reauth:setup:${request.userId}` },
            { identifier: `passkey-reauth:removal:${request.userId}` },
            { identifier: { startsWith: `email-change:${request.userId}:` } },
            { identifier: { startsWith: `mobile-password-reset:${request.userId}:` } },
            { identifier: { startsWith: `mobile-password-reset-grant:${request.userId}:` } },
            { identifier: { startsWith: `mobile-password-change:${request.userId}:` } },
          ],
        },
      });

      const historicalRequests = await tx.accountDeletionRequest.updateMany({
        where: { userId: request.userId },
        data: {
          email: redactedEmail,
          userReason: null,
          cancellationMetadata: Prisma.JsonNull,
        },
      });

      const updated = await tx.accountDeletionRequest.update({
        where: { id: request.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
          reviewNotes: reviewNotes.slice(0, 5000),
          adminNotificationId: adminReference.slice(0, 255),
        },
        include: { user: { select: { id: true, email: true, role: true, status: true } } },
      });

      const cleanupCounts: AccountDeletionCleanupCounts = {
        visitorsRetired,
        verificationTokensDeleted: verificationTokens.count,
        authAccountsDeleted: authAccounts.count,
        webSessionsDeleted: webSessions.count,
        accountSessionsDeleted: accountSessions.count,
        securityEventsDeleted: securityEvents.count,
        passkeysDeleted: passkeys.count,
        webAuthnChallengesDeleted: webAuthnChallenges.count,
        mobileLoginChallengesDeleted: mobileLoginChallenges.count,
        profileDeleted: profile.count,
        securitySettingsDeleted: securitySettings.count,
        customizationPreferencesDeleted: customizationPreferences.count,
        travelPreferencesDeleted: travelPreferences.count,
        savedFlightsDeleted: savedFlights.count,
        savedHotelsDeleted: savedHotels.count,
        savedCarsDeleted: savedCars.count,
        savedSearchesDeleted: savedSearches.count,
        recentSearchesDeleted: recentSearches.count,
        priceAlertsDeleted: priceAlerts.count,
        notificationsDeleted: notifications.count,
        tripsDeleted: trips.count,
        newsletterSubscribersAnonymized: newsletterSubscribers.count,
        supportTicketsDetached: supportTickets.count,
        searchHistoryDetached: searchHistory.count,
        redirectLogsDetached: redirectLogs.count,
        analyticsEventsDetached: analyticsEvents.count,
        previewAdminReferencesCleared: previewApproved.count + previewSuspended.count + previewRevoked.count,
        identityLinksDeleted: identityLinks.count,
        deletionRequestsRedacted: historicalRequests.count,
      };

      return { request: updated, cleanupCounts };
    });
  };
}

export const finalizeAccountDeletionRequest = createAccountDeletionFinalizer({
  database: getPrisma,
  protectedAdminEmail: isProtectedAdminEmail,
});
