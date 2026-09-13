import ExpoModulesCore
import MapKit
import UIKit

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

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .clear
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    controller?.view.frame = bounds
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

    let lookAroundController = MKLookAroundViewController(scene: scene)
    lookAroundController.isNavigationEnabled = true
    lookAroundController.showsRoadLabels = true
    lookAroundController.view.frame = bounds
    lookAroundController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
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
