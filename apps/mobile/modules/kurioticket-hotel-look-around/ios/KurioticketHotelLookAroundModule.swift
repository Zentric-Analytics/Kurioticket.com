import ExpoModulesCore

public final class KurioticketHotelLookAroundModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KurioticketHotelLookAround")

    View(KurioticketHotelLookAroundView.self) {
      Events("onStatusChange")

      Prop("latitude") { (view: KurioticketHotelLookAroundView, value: Double) in
        view.setLatitude(value)
      }
      Prop("longitude") { (view: KurioticketHotelLookAroundView, value: Double) in
        view.setLongitude(value)
      }
      Prop("hotelName") { (view: KurioticketHotelLookAroundView, value: String) in
        view.setHotelName(value)
      }
    }
  }
}
