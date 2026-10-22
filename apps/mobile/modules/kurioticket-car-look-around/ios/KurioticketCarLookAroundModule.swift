import ExpoModulesCore

public final class KurioticketCarLookAroundModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KurioticketCarLookAround")

    View(KurioticketCarLookAroundView.self) {
      Events("onStatusChange")

      Prop("latitude") { (view: KurioticketCarLookAroundView, value: Double) in
        view.setLatitude(value)
      }
      Prop("longitude") { (view: KurioticketCarLookAroundView, value: Double) in
        view.setLongitude(value)
      }
      Prop("locationLabel") { (view: KurioticketCarLookAroundView, value: String) in
        view.setLocationLabel(value)
      }
      Prop("presentationMode") { (view: KurioticketCarLookAroundView, value: String) in
        view.setPresentationMode(value)
      }
    }
  }
}
