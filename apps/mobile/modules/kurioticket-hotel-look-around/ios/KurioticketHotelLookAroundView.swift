import ExpoModulesCore
import MapKit
import UIKit

@available(iOS 16.0, *)
private final class InlineLookAroundViewController: MKLookAroundViewController {
  override func present(
    _ viewControllerToPresent: UIViewController,
    animated flag: Bool,
    completion: (() -> Void)? = nil
  ) {
    // Hotel Look Around intentionally stays inline, matching Android Street View.
  }

  override func show(_ viewController: UIViewController, sender: Any?) {
    // Do not let MapKit replace Hotel Details with its full-screen viewer.
  }

  override func showDetailViewController(_ viewController: UIViewController, sender: Any?) {
    // Do not let MapKit replace Hotel Details with its full-screen viewer.
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    hideFullScreenAffordance(in: view)
  }

  private func hideFullScreenAffordance(in root: UIView) {
    for subview in root.subviews {
      let frame = subview.convert(subview.bounds, to: view)
      let leadingEdgeDistance: CGFloat
      if view.effectiveUserInterfaceLayoutDirection == .rightToLeft {
        leadingEdgeDistance = view.bounds.width - frame.maxX
      } else {
        leadingEdgeDistance = frame.minX
      }
      let isTopLeadingControl = subview is UIControl
        && leadingEdgeDistance >= 0
        && leadingEdgeDistance <= 180
        && frame.minY <= 72
        && frame.width <= 220
        && frame.height <= 88

      if isTopLeadingControl {
        subview.isHidden = true
        subview.isUserInteractionEnabled = false
      } else {
        hideFullScreenAffordance(in: subview)
      }
    }
  }
}

final class KurioticketHotelLookAroundView: ExpoView {
  let onStatusChange = EventDispatcher()

  private var latitude: Double?
  private var longitude: Double?
  private var hotelName = "Hotel"
  private var controller: UIViewController?
  private var cancelActiveRequest: (() -> Void)?
  private var reloadWorkItem: DispatchWorkItem?
  private var generation = 0
  private var requestedCoordinateKey: String?
  private var interactionGate: UILongPressGestureRecognizer!

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .clear
    isUserInteractionEnabled = true
    isMultipleTouchEnabled = true

    let interactionGate = UILongPressGestureRecognizer(target: self, action: #selector(handleInteractionGate(_:)))
    interactionGate.minimumPressDuration = 0
    interactionGate.allowableMovement = CGFloat.greatestFiniteMagnitude
    interactionGate.cancelsTouchesInView = false
    interactionGate.delaysTouchesBegan = false
    interactionGate.delegate = self
    addGestureRecognizer(interactionGate)
    self.interactionGate = interactionGate
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    controller?.view.frame = bounds
  }

  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard isUserInteractionEnabled, !isHidden, alpha > 0.01,
          let controllerView = controller?.view else {
      return super.hitTest(point, with: event)
    }

    let controllerPoint = controllerView.convert(point, from: self)
    if controllerView.point(inside: controllerPoint, with: event),
       let target = controllerView.hitTest(controllerPoint, with: event) {
      return target
    }

    return super.hitTest(point, with: event)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      reloadWorkItem?.cancel()
      reloadWorkItem = nil
      cancelRequest()
      removeController()
      return
    }
    configureParentScrollGesturePriority()
    scheduleReload()
  }

  @objc private func handleInteractionGate(_ gestureRecognizer: UILongPressGestureRecognizer) {
    // Recognition is enough: the parent hotel ScrollView is required to fail,
    // while MapKit's own gestures are allowed to recognize simultaneously.
  }

  private func configureParentScrollGesturePriority() {
    var candidate = superview
    while let view = candidate {
      if let scrollView = view as? UIScrollView {
        scrollView.panGestureRecognizer.require(toFail: interactionGate)
        return
      }
      candidate = view.superview
    }
  }

  deinit {
    reloadWorkItem?.cancel()
    cancelRequest()
  }

  func setLatitude(_ value: Double) {
    latitude = value
    scheduleReload()
  }

  func setLongitude(_ value: Double) {
    longitude = value
    scheduleReload()
  }

  func setHotelName(_ value: String) {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    hotelName = trimmed.isEmpty ? "Hotel" : trimmed
    controller?.view.accessibilityLabel = "Look Around for \(hotelName)"
  }

  private func scheduleReload() {
    guard window != nil else { return }
    reloadWorkItem?.cancel()
    let item = DispatchWorkItem { [weak self] in
      self?.reloadScene()
    }
    reloadWorkItem = item
    DispatchQueue.main.async(execute: item)
  }

  private func reloadScene() {
    reloadWorkItem = nil
    guard let latitude, let longitude,
          latitude.isFinite, longitude.isFinite,
          (-90.0...90.0).contains(latitude),
          (-180.0...180.0).contains(longitude) else {
      requestedCoordinateKey = nil
      cancelRequest()
      removeController()
      emitStatus("unavailable")
      return
    }

    let coordinateKey = "\(latitude):\(longitude)"
    if requestedCoordinateKey == coordinateKey, controller != nil {
      return
    }

    requestedCoordinateKey = coordinateKey
    cancelRequest()
    removeController()
    generation += 1
    let requestGeneration = generation
    emitStatus("loading")

    guard #available(iOS 16.0, *) else {
      emitStatus("unavailable")
      return
    }

    let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    let request = MKLookAroundSceneRequest(coordinate: coordinate)
    cancelActiveRequest = { request.cancel() }
    request.getSceneWithCompletionHandler { [weak self] scene, _ in
      guard let self, self.generation == requestGeneration else { return }
      self.cancelActiveRequest = nil
      guard let scene else {
        self.emitStatus("unavailable")
        return
      }
      self.install(scene: scene)
    }
  }

  @available(iOS 16.0, *)
  private func install(scene: MKLookAroundScene) {
    removeController()

    let lookAroundController = InlineLookAroundViewController(scene: scene)
    lookAroundController.isNavigationEnabled = true
    lookAroundController.showsRoadLabels = true
    lookAroundController.view.frame = bounds
    lookAroundController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    lookAroundController.view.isUserInteractionEnabled = true
    lookAroundController.view.isMultipleTouchEnabled = true
    lookAroundController.view.accessibilityLabel = "Look Around for \(hotelName)"

    if let parent = nearestViewController() {
      parent.addChild(lookAroundController)
      addSubview(lookAroundController.view)
      lookAroundController.didMove(toParent: parent)
    } else {
      addSubview(lookAroundController.view)
    }

    controller = lookAroundController
    emitStatus("ready")
  }

  private func nearestViewController() -> UIViewController? {
    var responder: UIResponder? = self
    while let current = responder {
      if let viewController = current as? UIViewController {
        return viewController
      }
      responder = current.next
    }
    return nil
  }

  private func cancelRequest() {
    generation += 1
    cancelActiveRequest?()
    cancelActiveRequest = nil
  }

  private func removeController() {
    guard let controller else { return }
    if controller.parent != nil {
      controller.willMove(toParent: nil)
      controller.view.removeFromSuperview()
      controller.removeFromParent()
    } else {
      controller.view.removeFromSuperview()
    }
    self.controller = nil
  }

  private func emitStatus(_ status: String) {
    onStatusChange(["status": status])
  }
}

extension KurioticketHotelLookAroundView: UIGestureRecognizerDelegate {
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    gestureRecognizer === interactionGate || otherGestureRecognizer === interactionGate
  }
}
