import AuthenticationServices
import ExpoModulesCore
import UIKit

final class KurioticketPasskeyUsernameView: ExpoView, UITextFieldDelegate, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  let onChangeText = EventDispatcher()
  let onFocus = EventDispatcher()
  let onBlur = EventDispatcher()
  let onSubmit = EventDispatcher()
  let onPasskey = EventDispatcher()
  let onDiagnostic = EventDispatcher()

  private let textField = UITextField(frame: .zero)
  private var relyingPartyIdentifier: String?
  private var challenge: String?
  private var authorizationController: ASAuthorizationController?
  private var activeChallenge: String?
  private var autoFocusRequested = false
  private var diagnosticsEnabled = false
  private var focusFallbackWorkItem: DispatchWorkItem?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    textField.delegate = self
    textField.textContentType = .username
    textField.keyboardType = .emailAddress
    textField.autocapitalizationType = .none
    textField.autocorrectionType = .no
    textField.returnKeyType = .go
    textField.borderStyle = .none
    textField.backgroundColor = .clear
    textField.font = UIFont.systemFont(ofSize: 16)
    textField.textColor = UIColor(red: 6.0 / 255.0, green: 18.0 / 255.0, blue: 55.0 / 255.0, alpha: 1)
    textField.tintColor = UIColor(red: 7.0 / 255.0, green: 91.0 / 255.0, blue: 232.0 / 255.0, alpha: 1)
    textField.accessibilityLabel = "Email address"

    textField.addTarget(self, action: #selector(textDidChange), for: .editingChanged)
    textField.addTarget(self, action: #selector(editingDidBegin), for: .editingDidBegin)
    textField.addTarget(self, action: #selector(editingDidEnd), for: .editingDidEnd)
    addSubview(textField)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    textField.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      focusFallbackWorkItem?.cancel()
      focusFallbackWorkItem = nil
      cancelAuthorization()
      return
    }
    reconcileAuthorizationAndFocus()
  }

  deinit {
    focusFallbackWorkItem?.cancel()
    if #available(iOS 16.0, *) {
      authorizationController?.cancel()
    }
  }

  func setValue(_ value: String?) {
    let next = value ?? ""
    if textField.text != next {
      textField.text = next
    }
  }

  func setPlaceholder(_ value: String?) {
    let placeholder = value ?? ""
    textField.attributedPlaceholder = NSAttributedString(
      string: placeholder,
      attributes: [.foregroundColor: UIColor(red: 138.0 / 255.0, green: 147.0 / 255.0, blue: 166.0 / 255.0, alpha: 1)]
    )
  }

  func setEnabled(_ value: Bool) {
    textField.isEnabled = value
    if !value {
      focusFallbackWorkItem?.cancel()
      focusFallbackWorkItem = nil
      cancelAuthorization()
      return
    }
    reconcileAuthorizationAndFocus()
  }

  func setAutoFocus(_ value: Bool) {
    autoFocusRequested = value
    if !value {
      focusFallbackWorkItem?.cancel()
      focusFallbackWorkItem = nil
      return
    }
    reconcileAuthorizationAndFocus()
  }

  func setDiagnosticsEnabled(_ value: Bool) {
    diagnosticsEnabled = value
  }

  func setRelyingPartyIdentifier(_ value: String?) {
    let normalized = value?.trimmingCharacters(in: .whitespacesAndNewlines)
    if relyingPartyIdentifier != normalized {
      relyingPartyIdentifier = normalized
      cancelAuthorization()
    }
    reconcileAuthorizationAndFocus()
  }

  func setChallenge(_ value: String?) {
    let normalized = value?.trimmingCharacters(in: .whitespacesAndNewlines)
    if challenge != normalized {
      challenge = normalized
      cancelAuthorization()
    }
    reconcileAuthorizationAndFocus()
  }

  private func reconcileAuthorizationAndFocus() {
    guard window != nil, textField.isEnabled, autoFocusRequested else { return }

    guard #available(iOS 16.0, *),
          let rpId = relyingPartyIdentifier, !rpId.isEmpty,
          let challenge = challenge, !challenge.isEmpty else {
      scheduleFocusFallback()
      return
    }

    guard let challengeData = Self.decodeBase64Url(challenge) else {
      emitDiagnostic(stage: "invalid_challenge")
      scheduleFocusFallback()
      return
    }

    focusFallbackWorkItem?.cancel()
    focusFallbackWorkItem = nil

    if authorizationController != nil && activeChallenge == challenge {
      focusIfNeeded()
      return
    }

    cancelAuthorization()

    let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
    let request = provider.createCredentialAssertionRequest(challenge: challengeData)
    request.userVerificationPreference = .required
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self

    authorizationController = controller
    activeChallenge = challenge

    // Start conditional passkey discovery before the username field becomes first
    // responder. Requiring user verification makes a selected Kurioticket passkey
    // complete through Face ID/Touch ID rather than degrading to password AutoFill.
    controller.performAutoFillAssistedRequests()
    emitDiagnostic(stage: "autofill_started")
    focusIfNeeded()
  }

  private func scheduleFocusFallback() {
    guard !textField.isFirstResponder, focusFallbackWorkItem == nil else { return }

    let workItem = DispatchWorkItem { [weak self] in
      guard let self else { return }
      self.focusFallbackWorkItem = nil
      self.focusIfNeeded()
    }
    focusFallbackWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8, execute: workItem)
  }

  private func focusIfNeeded() {
    guard window != nil, textField.isEnabled, autoFocusRequested, !textField.isFirstResponder else { return }
    textField.becomeFirstResponder()
  }

  private func cancelAuthorization() {
    let active = authorizationController
    authorizationController = nil
    activeChallenge = nil
    if #available(iOS 16.0, *) {
      active?.cancel()
    }
  }

  private func finishAuthorization(_ completedController: ASAuthorizationController) {
    guard authorizationController === completedController else { return }
    authorizationController = nil
    activeChallenge = nil
  }

  @objc private func textDidChange() {
    onChangeText(["text": textField.text ?? ""])
  }

  @objc private func editingDidBegin() {
    onFocus([:])
  }

  @objc private func editingDidEnd() {
    onBlur([:])
  }

  func textFieldShouldReturn(_ textField: UITextField) -> Bool {
    onSubmit([:])
    return false
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    if let window = window { return window }
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    if let keyWindow = scenes.flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) { return keyWindow }
    return UIWindow(frame: UIScreen.main.bounds)
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard authorizationController === controller else { return }
    guard #available(iOS 16.0, *), let assertion = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
      emitDiagnostic(stage: "unexpected_credential")
      finishAuthorization(controller)
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

    finishAuthorization(controller)
    onPasskey(result)
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    guard authorizationController === controller else { return }
    emitDiagnostic(stage: "authorization_error", error: error as NSError)
    finishAuthorization(controller)
  }

  private func emitDiagnostic(stage: String, error: NSError? = nil) {
    guard diagnosticsEnabled else { return }
    var payload: [String: Any] = ["stage": stage]
    if let rpId = relyingPartyIdentifier { payload["rpId"] = rpId }
    if let error {
      payload["domain"] = error.domain
      payload["code"] = error.code
    }
    onDiagnostic(payload)
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
