import AuthenticationServices
import ExpoModulesCore
import UIKit

// Expo Module is not an NSObject. AuthenticationServices delegates must be.
private final class PasskeyAuthorizationDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  weak var owner: KurioticketPasskeyAutoFillModule?

  init(owner: KurioticketPasskeyAutoFillModule) {
    self.owner = owner
    super.init()
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    owner?.presentationAnchor(for: controller) ?? UIWindow(frame: UIScreen.main.bounds)
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    owner?.authorizationController(controller: controller, didCompleteWithAuthorization: authorization)
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    owner?.authorizationController(controller: controller, didCompleteWithError: error)
  }
}

public final class KurioticketPasskeyAutoFillModule: Module {
  private lazy var authorizationDelegate = PasskeyAuthorizationDelegate(owner: self)
  private var controller: ASAuthorizationController?
  private var promise: Promise?
  private var started = false
  private var startWaiters: [Promise] = []

  public func definition() -> ModuleDefinition {
    Name("KurioticketPasskeyAutoFill")

    AsyncFunction("start") { (relyingPartyIdentifier: String, challenge: String, promise: Promise) in
      self.cancelActive(resolveCancelled: true)

      guard #available(iOS 16.0, *), let challengeData = Self.decodeBase64Url(challenge) else {
        promise.resolve(nil)
        return
      }

      let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: relyingPartyIdentifier)
      let request = provider.createCredentialAssertionRequest(challenge: challengeData)
      request.userVerificationPreference = .required
      let controller = ASAuthorizationController(authorizationRequests: [request])
      controller.delegate = self.authorizationDelegate
      controller.presentationContextProvider = self.authorizationDelegate

      self.promise = promise
      self.controller = controller
      controller.performAutoFillAssistedRequests()
      self.started = true
      self.resolveStartWaiters(true)
    }.runOnQueue(.main)

    AsyncFunction("waitUntilStarted") { (promise: Promise) in
      if self.started && self.controller != nil {
        promise.resolve(true)
      } else {
        self.startWaiters.append(promise)
      }
    }.runOnQueue(.main)

    Function("cancel") {
      self.cancelActive(resolveCancelled: true)
    }

    View(KurioticketPasskeyUsernameView.self) {
      Events("onChangeText", "onFocus", "onBlur", "onSubmit", "onPasskey", "onDiagnostic")

      Prop("value") { (view: KurioticketPasskeyUsernameView, value: String?) in view.setValue(value) }
      Prop("placeholder") { (view: KurioticketPasskeyUsernameView, value: String?) in view.setPlaceholder(value) }
      Prop("enabled") { (view: KurioticketPasskeyUsernameView, value: Bool) in view.setEnabled(value) }
      Prop("autoFocus") { (view: KurioticketPasskeyUsernameView, value: Bool) in view.setAutoFocus(value) }
      Prop("diagnosticsEnabled") { (view: KurioticketPasskeyUsernameView, value: Bool) in view.setDiagnosticsEnabled(value) }
      Prop("relyingPartyIdentifier") { (view: KurioticketPasskeyUsernameView, value: String?) in view.setRelyingPartyIdentifier(value) }
      Prop("challenge") { (view: KurioticketPasskeyUsernameView, value: String?) in view.setChallenge(value) }
    }
  }

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    if let window = scenes.flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) { return window }
    return UIWindow(frame: UIScreen.main.bounds)
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard self.controller === controller else { return }
    guard #available(iOS 16.0, *), let assertion = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
      finish(controller: controller, result: nil)
      return
    }

    let credentialId = Self.encodeBase64Url(assertion.credentialID)
    let userHandle: Any = assertion.userID.isEmpty ? NSNull() : Self.encodeBase64Url(assertion.userID)
    let result: [String: Any] = [
      "id": credentialId,
      "rawId": credentialId,
      "type": "public-key",
      "response": [
        "clientDataJSON": Self.encodeBase64Url(assertion.rawClientDataJSON),
        "authenticatorData": Self.encodeBase64Url(assertion.rawAuthenticatorData),
        "signature": Self.encodeBase64Url(assertion.signature),
        "userHandle": userHandle
      ],
      "authenticatorAttachment": "platform",
      "clientExtensionResults": [String: Any]()
    ]
    finish(controller: controller, result: result)
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    finish(controller: controller, result: nil)
  }

  private func finish(controller completedController: ASAuthorizationController, result: Any?) {
    guard controller === completedController else { return }
    let pending = promise
    promise = nil
    controller = nil
    started = false
    resolveStartWaiters(false)
    pending?.resolve(result)
  }

  private func cancelActive(resolveCancelled: Bool) {
    let activeController = controller
    let pending = promise
    controller = nil
    promise = nil
    started = false
    if #available(iOS 16.0, *) {
      activeController?.cancel()
    }
    resolveStartWaiters(false)
    if resolveCancelled { pending?.resolve(nil) }
  }

  private func resolveStartWaiters(_ value: Bool) {
    let waiters = startWaiters
    startWaiters.removeAll()
    waiters.forEach { $0.resolve(value) }
  }

  private static func decodeBase64Url(_ value: String) -> Data? {
    var normalized = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    let remainder = normalized.count % 4
    if remainder != 0 { normalized.append(String(repeating: "=", count: 4 - remainder)) }
    return Data(base64Encoded: normalized)
  }

  private static func encodeBase64Url(_ data: Data) -> String {
    data.base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }
}
