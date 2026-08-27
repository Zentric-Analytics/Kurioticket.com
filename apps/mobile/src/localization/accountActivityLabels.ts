import type { MobileLocale } from "./mobileLocalizationCatalog";

export const accountActivityEventTypes = [
  "PASSWORD_CHANGED",
  "SIGN_IN",
  "MOBILE_SESSION_CREATED",
  "SESSION_REVOKED",
  "ALL_SESSIONS_REVOKED",
] as const;

export type AccountActivityEventType = typeof accountActivityEventTypes[number];

type AccountActivityLabels = Record<AccountActivityEventType, string>;

const labels: Record<MobileLocale, AccountActivityLabels> = {
  "en-us": { PASSWORD_CHANGED: "Password changed", SIGN_IN: "Signed in", MOBILE_SESSION_CREATED: "Mobile session started", SESSION_REVOKED: "Device removed", ALL_SESSIONS_REVOKED: "Signed out everywhere" },
  "es-es": { PASSWORD_CHANGED: "Contraseña cambiada", SIGN_IN: "Inicio de sesión", MOBILE_SESSION_CREATED: "Sesión móvil iniciada", SESSION_REVOKED: "Dispositivo eliminado", ALL_SESSIONS_REVOKED: "Sesión cerrada en todas partes" },
  fr: { PASSWORD_CHANGED: "Mot de passe modifié", SIGN_IN: "Connexion effectuée", MOBILE_SESSION_CREATED: "Session mobile démarrée", SESSION_REVOKED: "Appareil supprimé", ALL_SESSIONS_REVOKED: "Déconnexion de tous les appareils" },
  "de-de": { PASSWORD_CHANGED: "Passwort geändert", SIGN_IN: "Angemeldet", MOBILE_SESSION_CREATED: "Mobile Sitzung gestartet", SESSION_REVOKED: "Gerät entfernt", ALL_SESSIONS_REVOKED: "Überall abgemeldet" },
  "it-it": { PASSWORD_CHANGED: "Password modificata", SIGN_IN: "Accesso effettuato", MOBILE_SESSION_CREATED: "Sessione mobile avviata", SESSION_REVOKED: "Dispositivo rimosso", ALL_SESSIONS_REVOKED: "Disconnessione da tutti i dispositivi" },
  "pt-br": { PASSWORD_CHANGED: "Senha alterada", SIGN_IN: "Login realizado", MOBILE_SESSION_CREATED: "Sessão móvel iniciada", SESSION_REVOKED: "Dispositivo removido", ALL_SESSIONS_REVOKED: "Sessão encerrada em todos os dispositivos" },
  nl: { PASSWORD_CHANGED: "Wachtwoord gewijzigd", SIGN_IN: "Aangemeld", MOBILE_SESSION_CREATED: "Mobiele sessie gestart", SESSION_REVOKED: "Apparaat verwijderd", ALL_SESSIONS_REVOKED: "Overal afgemeld" },
  ar: { PASSWORD_CHANGED: "تم تغيير كلمة المرور", SIGN_IN: "تم تسجيل الدخول", MOBILE_SESSION_CREATED: "بدأت جلسة على الهاتف", SESSION_REVOKED: "تمت إزالة الجهاز", ALL_SESSIONS_REVOKED: "تم تسجيل الخروج من جميع الأجهزة" },
  "zh-cn": { PASSWORD_CHANGED: "密码已更改", SIGN_IN: "已登录", MOBILE_SESSION_CREATED: "移动会话已开始", SESSION_REVOKED: "设备已移除", ALL_SESSIONS_REVOKED: "已从所有设备退出登录" },
  ja: { PASSWORD_CHANGED: "パスワードを変更しました", SIGN_IN: "サインインしました", MOBILE_SESSION_CREATED: "モバイルセッションを開始しました", SESSION_REVOKED: "デバイスを削除しました", ALL_SESSIONS_REVOKED: "すべてのデバイスからサインアウトしました" },
  ko: { PASSWORD_CHANGED: "비밀번호가 변경됨", SIGN_IN: "로그인함", MOBILE_SESSION_CREATED: "모바일 세션이 시작됨", SESSION_REVOKED: "기기가 제거됨", ALL_SESSIONS_REVOKED: "모든 기기에서 로그아웃됨" },
  hi: { PASSWORD_CHANGED: "पासवर्ड बदला गया", SIGN_IN: "साइन इन किया गया", MOBILE_SESSION_CREATED: "मोबाइल सत्र शुरू हुआ", SESSION_REVOKED: "डिवाइस हटाया गया", ALL_SESSIONS_REVOKED: "सभी डिवाइस से साइन आउट किया गया" },
  tr: { PASSWORD_CHANGED: "Şifre değiştirildi", SIGN_IN: "Oturum açıldı", MOBILE_SESSION_CREATED: "Mobil oturum başlatıldı", SESSION_REVOKED: "Cihaz kaldırıldı", ALL_SESSIONS_REVOKED: "Her yerden çıkış yapıldı" },
  pl: { PASSWORD_CHANGED: "Hasło zmienione", SIGN_IN: "Zalogowano", MOBILE_SESSION_CREATED: "Rozpoczęto sesję mobilną", SESSION_REVOKED: "Urządzenie usunięte", ALL_SESSIONS_REVOKED: "Wylogowano ze wszystkich urządzeń" },
  sv: { PASSWORD_CHANGED: "Lösenordet ändrades", SIGN_IN: "Inloggad", MOBILE_SESSION_CREATED: "Mobilsession startad", SESSION_REVOKED: "Enhet borttagen", ALL_SESSIONS_REVOKED: "Utloggad överallt" },
  id: { PASSWORD_CHANGED: "Kata sandi diubah", SIGN_IN: "Berhasil masuk", MOBILE_SESSION_CREATED: "Sesi seluler dimulai", SESSION_REVOKED: "Perangkat dihapus", ALL_SESSIONS_REVOKED: "Keluar dari semua perangkat" },
  th: { PASSWORD_CHANGED: "เปลี่ยนรหัสผ่านแล้ว", SIGN_IN: "เข้าสู่ระบบแล้ว", MOBILE_SESSION_CREATED: "เริ่มเซสชันบนมือถือแล้ว", SESSION_REVOKED: "นำอุปกรณ์ออกแล้ว", ALL_SESSIONS_REVOKED: "ออกจากระบบทุกอุปกรณ์แล้ว" },
  vi: { PASSWORD_CHANGED: "Đã đổi mật khẩu", SIGN_IN: "Đã đăng nhập", MOBILE_SESSION_CREATED: "Đã bắt đầu phiên di động", SESSION_REVOKED: "Đã xóa thiết bị", ALL_SESSIONS_REVOKED: "Đã đăng xuất trên mọi thiết bị" },
};

export function localizedAccountActivityLabel(type: string, locale: MobileLocale, unknownLabel: string): string {
  return accountActivityEventTypes.includes(type as AccountActivityEventType)
    ? labels[locale][type as AccountActivityEventType]
    : unknownLabel;
}
