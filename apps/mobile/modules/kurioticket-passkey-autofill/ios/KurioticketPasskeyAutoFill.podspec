Pod::Spec.new do |s|
  s.name           = 'KurioticketPasskeyAutoFill'
  s.version        = '0.1.0'
  s.summary        = 'Kurioticket iOS passkey AutoFill bridge'
  s.description    = 'Native AuthenticationServices integration for conditional Kurioticket passkey sign-in.'
  s.author         = 'Zentric Analytics'
  s.homepage       = 'https://kurioticket.com'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/Zentric-Analytics/Kurioticket.com.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
