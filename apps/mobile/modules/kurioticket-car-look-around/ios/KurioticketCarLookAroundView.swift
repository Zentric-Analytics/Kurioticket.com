import ExpoModulesCore
import MapKit
import SwiftUI
import UIKit

@available(iOS 17.0, *)
private struct CarLookAroundPreview: View {
  let scene: MKLookAroundScene

  var body: some View {
    LookAroundPreview(
      initialScene: scene,
      allowsNavigation: true,
      showsRoadLabels: true,
      pointsOfInterest: .excludingAll,
      badgePosition: .topLeading
    )
  }
}

final class KurioticketCarLookAroundView: ExpoView {
  let onStatusChange = EventDispatcher()

  private enum PresentationMode: Equatable {
    case swiftUI
    case viewController
  }

  private var latitude: Double?
  private var longitude: Double?
  private var locationLabel = "Pickup location"
  private var presentationMode: PresentationMode = .swiftUI
  private var controller: UIViewController?
  private var cancelActiveRequest: (() -> Void)?
  private var reloadWorkItem: DispatchWorkItem?
  private var generation = 0
  private var requestedCoordinateKey: String?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .clear
    isUserInteractionEnabled = true
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    controller?.view.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil else {
      reloadWorkItem?.cancel()
      reloadWorkItem = nil
      requestedCoordinateKey = nil
      cancelRequest()
      removeController()
      return
    }
    scheduleReload()
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

  func setLocationLabel(_ value: String) {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    locationLabel = trimmed.isEmpty ? "Pickup location" : trimmed
    controller?.view.accessibilityLabel = "Look Around near \(locationLabel)"
  }

  func setPresentationMode(_ value: String) {
    let nextMode: PresentationMode = value == "viewController" ? .viewController : .swiftUI
    guard nextMode != presentationMode else { return }
    presentationMode = nextMode
    requestedCoordinateKey = nil
    scheduleReload()
  }

  private func scheduleReload() {
    guard window != nil else { return }
    reloadWorkItem?.cancel()
    let item = DispatchWorkItem { [weak self] in self?.reloadScene() }
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

    let modeKey = presentationMode == .viewController ? "viewController" : "swiftUI"
    let coordinateKey = "\(latitude):\(longitude):\(modeKey)"
    if requestedCoordinateKey == coordinateKey, controller != nil { return }

    requestedCoordinateKey = coordinateKey
    cancelRequest()
    removeController()
    generation += 1
    let requestGeneration = generation
    emitStatus("loading")

    guard #available(iOS 17.0, *) else {
      emitStatus("unavailable")
      return
    }

    let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    let request = MKLookAroundSceneRequest(coordinate: coordinate)
    cancelActiveRequest = { request.cancel() }
    request.getSceneWithCompletionHandler { [weak self] scene, _ in
      DispatchQueue.main.async {
        guard let self, self.window != nil, self.generation == requestGeneration else { return }
        self.cancelActiveRequest = nil
        guard let scene else {
          self.emitStatus("unavailable")
          return
        }
        self.install(scene: scene)
      }
    }
  }

  @available(iOS 17.0, *)
  private func install(scene: MKLookAroundScene) {
    removeController()

    let childController: UIViewController
    switch presentationMode {
    case .swiftUI:
      let hostingController = UIHostingController(rootView: CarLookAroundPreview(scene: scene))
      hostingController.view.backgroundColor = .clear
      childController = hostingController
    case .viewController:
      let lookAroundController = MKLookAroundViewController(scene: scene)
      lookAroundController.isNavigationEnabled = true
      lookAroundController.showsRoadLabels = true
      lookAroundController.pointOfInterestFilter = .excludingAll
      lookAroundController.badgePosition = .topLeading
      childController = lookAroundController
    }

    childController.view.backgroundColor = .clear
    childController.view.frame = bounds
    childController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    childController.view.accessibilityLabel = "Look Around near \(locationLabel)"

    guard let parent = nearestViewController() else {
      emitStatus("unavailable")
      return
    }
    parent.addChild(childController)
    addSubview(childController.view)
    childController.didMove(toParent: parent)
    controller = childController
    emitStatus("ready")
  }

  private func nearestViewController() -> UIViewController? {
    var responder: UIResponder? = self
    while let current = responder {
      if let viewController = current as? UIViewController { return viewController }
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
    controller.willMove(toParent: nil)
    controller.view.removeFromSuperview()
    controller.removeFromParent()
    self.controller = nil
  }

  private func emitStatus(_ status: String) {
    onStatusChange(["status": status])
  }
}
