Pod::Spec.new do |s|
  s.name           = 'KurioticketCarLookAround'
  s.version        = '0.1.0'
  s.summary        = 'Kurioticket Cars Apple Look Around preview'
  s.description    = 'Native MapKit Look Around preview and viewer for Kurioticket Cars on iOS.'
  s.author         = 'Zentric Analytics'
  s.homepage       = 'https://kurioticket.com'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/Zentric-Analytics/Kurioticket.com.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'MapKit'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
