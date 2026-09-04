import AuthenticationServices
import ExpoModulesCore
import UIKit

public final class KurioticketPasskeyAutoFillModule: Module, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  private var controller: ASAuthorizationController?
  private var promise: Promise?

  public func definition() -> ModuleDefinition {
    Name("KurioticketPasskeyAutoFill")

    AsyncFunction("start") { (relyingPartyIdentifier: String, challenge: String, promise: Promise) in
      DispatchQueue.main.async {
        self.cancelActive(resolveCancelled: true)

        guard #available(iOS 16.0, *), let challengeData = Self.decodeBase64Url(challenge) else {
          promise.resolve(nil)
          return
        }

        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: relyingPartyIdentifier)
        let request = provider.createCredentialAssertionRequest(challenge: challengeData)
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self

        self.promise = promise
        self.controller = controller
        controller.performAutoFillAssistedRequests()
      }
    }

    Function("cancel") {
      DispatchQueue.main.async {
        self.cancelActive(resolveCancelled: true)
      }
    }
  }

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    if let window = scenes.flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) {
      return window
    }
    return ASPresentationAnchor()
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard #available(iOS 16.0, *), let assertion = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
      finish(result: nil)
      return
    }

    let credentialId = Self.encodeBase64Url(assertion.credentialID)
    let result: [String: Any?] = [
      "id": credentialId,
      "rawId": credentialId,
      "type": "public-key",
      "response": [
        "clientDataJSON": Self.encodeBase64Url(assertion.rawClientDataJSON),
        "authenticatorData": Self.encodeBase64Url(assertion.rawAuthenticatorData),
        "signature": Self.encodeBase64Url(assertion.signature),
        "userHandle": assertion.userID.isEmpty ? nil : Self.encodeBase64Url(assertion.userID)
      ],
      "authenticatorAttachment": nil,
      "clientExtensionResults": [:]
    ]
    finish(result: result)
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    finish(result: nil)
  }

  private func finish(result: Any?) {
    let pending = promise
    promise = nil
    controller = nil
    pending?.resolve(result)
  }

  private func cancelActive(resolveCancelled: Bool) {
    controller?.cancel()
    controller = nil
    if resolveCancelled {
      let pending = promise
      promise = nil
      pending?.resolve(nil)
    } else {
      promise = nil
    }
  }

  private static func decodeBase64Url(_ value: String) -> Data? {
    var normalized = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    let remainder = normalized.count % 4
    if remainder != 0 {
      normalized.append(String(repeating: "=", count: 4 - remainder))
    }
    return Data(base64Encoded: normalized)
  }

  private static func encodeBase64Url(_ data: Data) -> String {
    data.base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }
}
