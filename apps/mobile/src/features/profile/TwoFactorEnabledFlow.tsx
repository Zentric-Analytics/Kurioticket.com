import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { TravelApiError, travelApi } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../../theme/AppTheme";
import { flowColors } from "../flow/flowStyles";
import type { SecurityCopy } from "./securityLocalization";

type VerificationMethod = "authenticator" | "recovery" | "password";
type Stage = "overview" | "verify";

type Props = {
  active: boolean;
  hasPassword: boolean;
  copy: SecurityCopy;
  onUnauthorized: (error: unknown) => Promise<boolean>;
  onDisabled: () => Promise<void>;
};

type EnabledFlowCopy = {
  onTitle: string;
  onBody: string;
  authenticatorApp: string;
  turnOff: string;
  verifyTitle: string;
  verifyBody: string;
  authenticatorCode: string;
  authenticatorPlaceholder: string;
  authenticatorRequired: string;
  authenticatorIncorrect: string;
  useAnother: string;
  chooseMethod: string;
  recoveryCode: string;
  recoveryHelp: string;
  recoveryRequired: string;
  recoveryIncorrect: string;
  password: string;
  passwordHelp: string;
  passwordRequired: string;
  passwordIncorrect: string;
};

const flowCopy: Record<MobileLocale, EnabledFlowCopy> = {
  "en-us": { onTitle: "Two-factor authentication is on", onBody: "Your account is protected with an authenticator app.", authenticatorApp: "Authenticator app", turnOff: "Turn off two-factor authentication", verifyTitle: "Verify it’s you", verifyBody: "To continue, verify that it’s you.", authenticatorCode: "Authenticator code", authenticatorPlaceholder: "6-digit code", authenticatorRequired: "Enter the 6-digit code from your authenticator app.", authenticatorIncorrect: "Authenticator code is incorrect.", useAnother: "Use another verification method", chooseMethod: "Choose a verification method", recoveryCode: "Recovery code", recoveryHelp: "Use one of your saved recovery codes.", recoveryRequired: "Enter a recovery code.", recoveryIncorrect: "Recovery code is incorrect.", password: "Password", passwordHelp: "Use your Kurioticket account password.", passwordRequired: "Enter your password.", passwordIncorrect: "Password is incorrect." },
  "es-es": { onTitle: "La autenticación en dos pasos está activada", onBody: "Tu cuenta está protegida con una aplicación de autenticación.", authenticatorApp: "Aplicación de autenticación", turnOff: "Desactivar la autenticación en dos pasos", verifyTitle: "Verifica que eres tú", verifyBody: "Para continuar, verifica que eres tú.", authenticatorCode: "Código del autenticador", authenticatorPlaceholder: "Código de 6 dígitos", authenticatorRequired: "Introduce el código de 6 dígitos de tu aplicación de autenticación.", authenticatorIncorrect: "El código del autenticador es incorrecto.", useAnother: "Usar otro método de verificación", chooseMethod: "Elige un método de verificación", recoveryCode: "Código de recuperación", recoveryHelp: "Usa uno de tus códigos de recuperación guardados.", recoveryRequired: "Introduce un código de recuperación.", recoveryIncorrect: "El código de recuperación es incorrecto.", password: "Contraseña", passwordHelp: "Usa la contraseña de tu cuenta de Kurioticket.", passwordRequired: "Introduce tu contraseña.", passwordIncorrect: "La contraseña es incorrecta." },
  fr: { onTitle: "L’authentification à deux facteurs est activée", onBody: "Votre compte est protégé par une application d’authentification.", authenticatorApp: "Application d’authentification", turnOff: "Désactiver l’authentification à deux facteurs", verifyTitle: "Vérifiez votre identité", verifyBody: "Pour continuer, vérifiez votre identité.", authenticatorCode: "Code d’authentification", authenticatorPlaceholder: "Code à 6 chiffres", authenticatorRequired: "Saisissez le code à 6 chiffres de votre application d’authentification.", authenticatorIncorrect: "Le code d’authentification est incorrect.", useAnother: "Utiliser une autre méthode de vérification", chooseMethod: "Choisissez une méthode de vérification", recoveryCode: "Code de récupération", recoveryHelp: "Utilisez l’un de vos codes de récupération enregistrés.", recoveryRequired: "Saisissez un code de récupération.", recoveryIncorrect: "Le code de récupération est incorrect.", password: "Mot de passe", passwordHelp: "Utilisez le mot de passe de votre compte Kurioticket.", passwordRequired: "Saisissez votre mot de passe.", passwordIncorrect: "Le mot de passe est incorrect." },
  "de-de": { onTitle: "Zwei-Faktor-Authentifizierung ist aktiviert", onBody: "Ihr Konto ist mit einer Authenticator-App geschützt.", authenticatorApp: "Authenticator-App", turnOff: "Zwei-Faktor-Authentifizierung deaktivieren", verifyTitle: "Bestätigen Sie Ihre Identität", verifyBody: "Bestätigen Sie Ihre Identität, um fortzufahren.", authenticatorCode: "Authenticator-Code", authenticatorPlaceholder: "6-stelliger Code", authenticatorRequired: "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.", authenticatorIncorrect: "Der Authenticator-Code ist falsch.", useAnother: "Andere Bestätigungsmethode verwenden", chooseMethod: "Bestätigungsmethode auswählen", recoveryCode: "Wiederherstellungscode", recoveryHelp: "Verwenden Sie einen Ihrer gespeicherten Wiederherstellungscodes.", recoveryRequired: "Geben Sie einen Wiederherstellungscode ein.", recoveryIncorrect: "Der Wiederherstellungscode ist falsch.", password: "Passwort", passwordHelp: "Verwenden Sie das Passwort Ihres Kurioticket-Kontos.", passwordRequired: "Geben Sie Ihr Passwort ein.", passwordIncorrect: "Das Passwort ist falsch." },
  "it-it": { onTitle: "L’autenticazione a due fattori è attiva", onBody: "Il tuo account è protetto con un’app di autenticazione.", authenticatorApp: "App di autenticazione", turnOff: "Disattiva l’autenticazione a due fattori", verifyTitle: "Verifica la tua identità", verifyBody: "Per continuare, verifica la tua identità.", authenticatorCode: "Codice autenticatore", authenticatorPlaceholder: "Codice a 6 cifre", authenticatorRequired: "Inserisci il codice a 6 cifre della tua app di autenticazione.", authenticatorIncorrect: "Il codice autenticatore non è corretto.", useAnother: "Usa un altro metodo di verifica", chooseMethod: "Scegli un metodo di verifica", recoveryCode: "Codice di recupero", recoveryHelp: "Usa uno dei codici di recupero salvati.", recoveryRequired: "Inserisci un codice di recupero.", recoveryIncorrect: "Il codice di recupero non è corretto.", password: "Password", passwordHelp: "Usa la password del tuo account Kurioticket.", passwordRequired: "Inserisci la password.", passwordIncorrect: "La password non è corretta." },
  "pt-br": { onTitle: "A autenticação de dois fatores está ativada", onBody: "Sua conta está protegida com um aplicativo autenticador.", authenticatorApp: "Aplicativo autenticador", turnOff: "Desativar autenticação de dois fatores", verifyTitle: "Verifique sua identidade", verifyBody: "Para continuar, verifique sua identidade.", authenticatorCode: "Código do autenticador", authenticatorPlaceholder: "Código de 6 dígitos", authenticatorRequired: "Digite o código de 6 dígitos do seu aplicativo autenticador.", authenticatorIncorrect: "O código do autenticador está incorreto.", useAnother: "Usar outro método de verificação", chooseMethod: "Escolha um método de verificação", recoveryCode: "Código de recuperação", recoveryHelp: "Use um dos seus códigos de recuperação salvos.", recoveryRequired: "Digite um código de recuperação.", recoveryIncorrect: "O código de recuperação está incorreto.", password: "Senha", passwordHelp: "Use a senha da sua conta Kurioticket.", passwordRequired: "Digite sua senha.", passwordIncorrect: "A senha está incorreta." },
  nl: { onTitle: "Tweestapsverificatie is ingeschakeld", onBody: "Uw account is beveiligd met een authenticator-app.", authenticatorApp: "Authenticator-app", turnOff: "Tweestapsverificatie uitschakelen", verifyTitle: "Controleer dat u het bent", verifyBody: "Controleer uw identiteit om door te gaan.", authenticatorCode: "Authenticatorcode", authenticatorPlaceholder: "6-cijferige code", authenticatorRequired: "Voer de 6-cijferige code uit uw authenticator-app in.", authenticatorIncorrect: "De authenticatorcode is onjuist.", useAnother: "Andere verificatiemethode gebruiken", chooseMethod: "Kies een verificatiemethode", recoveryCode: "Herstelcode", recoveryHelp: "Gebruik een van uw opgeslagen herstelcodes.", recoveryRequired: "Voer een herstelcode in.", recoveryIncorrect: "De herstelcode is onjuist.", password: "Wachtwoord", passwordHelp: "Gebruik het wachtwoord van uw Kurioticket-account.", passwordRequired: "Voer uw wachtwoord in.", passwordIncorrect: "Het wachtwoord is onjuist." },
  ar: { onTitle: "المصادقة الثنائية مفعّلة", onBody: "حسابك محمي باستخدام تطبيق مصادقة.", authenticatorApp: "تطبيق المصادقة", turnOff: "إيقاف المصادقة الثنائية", verifyTitle: "تحقق من هويتك", verifyBody: "للمتابعة، تحقق من هويتك.", authenticatorCode: "رمز تطبيق المصادقة", authenticatorPlaceholder: "رمز من 6 أرقام", authenticatorRequired: "أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.", authenticatorIncorrect: "رمز تطبيق المصادقة غير صحيح.", useAnother: "استخدام طريقة تحقق أخرى", chooseMethod: "اختر طريقة تحقق", recoveryCode: "رمز الاسترداد", recoveryHelp: "استخدم أحد رموز الاسترداد المحفوظة.", recoveryRequired: "أدخل رمز استرداد.", recoveryIncorrect: "رمز الاسترداد غير صحيح.", password: "كلمة المرور", passwordHelp: "استخدم كلمة مرور حساب Kurioticket.", passwordRequired: "أدخل كلمة المرور.", passwordIncorrect: "كلمة المرور غير صحيحة." },
  "zh-cn": { onTitle: "双重验证已开启", onBody: "您的账户已通过身份验证器应用获得保护。", authenticatorApp: "身份验证器应用", turnOff: "关闭双重验证", verifyTitle: "验证是您本人", verifyBody: "要继续，请验证是您本人。", authenticatorCode: "身份验证器代码", authenticatorPlaceholder: "6 位代码", authenticatorRequired: "请输入身份验证器应用中的 6 位代码。", authenticatorIncorrect: "身份验证器代码不正确。", useAnother: "使用其他验证方式", chooseMethod: "选择验证方式", recoveryCode: "恢复代码", recoveryHelp: "使用您保存的一个恢复代码。", recoveryRequired: "请输入恢复代码。", recoveryIncorrect: "恢复代码不正确。", password: "密码", passwordHelp: "使用您的 Kurioticket 账户密码。", passwordRequired: "请输入密码。", passwordIncorrect: "密码不正确。" },
  ja: { onTitle: "2要素認証はオンです", onBody: "認証アプリでアカウントが保護されています。", authenticatorApp: "認証アプリ", turnOff: "2要素認証をオフにする", verifyTitle: "本人確認", verifyBody: "続行するには本人確認を行ってください。", authenticatorCode: "認証アプリのコード", authenticatorPlaceholder: "6桁のコード", authenticatorRequired: "認証アプリの6桁のコードを入力してください。", authenticatorIncorrect: "認証アプリのコードが正しくありません。", useAnother: "別の確認方法を使用", chooseMethod: "確認方法を選択", recoveryCode: "リカバリーコード", recoveryHelp: "保存したリカバリーコードを1つ使用します。", recoveryRequired: "リカバリーコードを入力してください。", recoveryIncorrect: "リカバリーコードが正しくありません。", password: "パスワード", passwordHelp: "Kurioticketアカウントのパスワードを使用します。", passwordRequired: "パスワードを入力してください。", passwordIncorrect: "パスワードが正しくありません。" },
  ko: { onTitle: "2단계 인증이 켜져 있습니다", onBody: "인증 앱으로 계정이 보호되고 있습니다.", authenticatorApp: "인증 앱", turnOff: "2단계 인증 끄기", verifyTitle: "본인 확인", verifyBody: "계속하려면 본인임을 확인하세요.", authenticatorCode: "인증 앱 코드", authenticatorPlaceholder: "6자리 코드", authenticatorRequired: "인증 앱의 6자리 코드를 입력하세요.", authenticatorIncorrect: "인증 앱 코드가 올바르지 않습니다.", useAnother: "다른 인증 방법 사용", chooseMethod: "인증 방법 선택", recoveryCode: "복구 코드", recoveryHelp: "저장한 복구 코드 중 하나를 사용하세요.", recoveryRequired: "복구 코드를 입력하세요.", recoveryIncorrect: "복구 코드가 올바르지 않습니다.", password: "비밀번호", passwordHelp: "Kurioticket 계정 비밀번호를 사용하세요.", passwordRequired: "비밀번호를 입력하세요.", passwordIncorrect: "비밀번호가 올바르지 않습니다." },
  hi: { onTitle: "दो-कारक प्रमाणीकरण चालू है", onBody: "आपका खाता ऑथेंटिकेटर ऐप से सुरक्षित है।", authenticatorApp: "ऑथेंटिकेटर ऐप", turnOff: "दो-कारक प्रमाणीकरण बंद करें", verifyTitle: "पुष्टि करें कि यह आप हैं", verifyBody: "जारी रखने के लिए अपनी पहचान सत्यापित करें।", authenticatorCode: "ऑथेंटिकेटर कोड", authenticatorPlaceholder: "6 अंकों का कोड", authenticatorRequired: "अपने ऑथेंटिकेटर ऐप का 6 अंकों का कोड दर्ज करें।", authenticatorIncorrect: "ऑथेंटिकेटर कोड गलत है।", useAnother: "दूसरी सत्यापन विधि का उपयोग करें", chooseMethod: "सत्यापन विधि चुनें", recoveryCode: "रिकवरी कोड", recoveryHelp: "अपने सहेजे गए रिकवरी कोड में से एक का उपयोग करें।", recoveryRequired: "रिकवरी कोड दर्ज करें।", recoveryIncorrect: "रिकवरी कोड गलत है।", password: "पासवर्ड", passwordHelp: "अपने Kurioticket खाते का पासवर्ड उपयोग करें।", passwordRequired: "अपना पासवर्ड दर्ज करें।", passwordIncorrect: "पासवर्ड गलत है।" },
  tr: { onTitle: "İki faktörlü kimlik doğrulama açık", onBody: "Hesabınız bir kimlik doğrulama uygulamasıyla korunuyor.", authenticatorApp: "Kimlik doğrulama uygulaması", turnOff: "İki faktörlü kimlik doğrulamayı kapat", verifyTitle: "Siz olduğunuzu doğrulayın", verifyBody: "Devam etmek için kimliğinizi doğrulayın.", authenticatorCode: "Kimlik doğrulama kodu", authenticatorPlaceholder: "6 haneli kod", authenticatorRequired: "Kimlik doğrulama uygulamanızdaki 6 haneli kodu girin.", authenticatorIncorrect: "Kimlik doğrulama kodu yanlış.", useAnother: "Başka bir doğrulama yöntemi kullan", chooseMethod: "Doğrulama yöntemi seçin", recoveryCode: "Kurtarma kodu", recoveryHelp: "Kaydettiğiniz kurtarma kodlarından birini kullanın.", recoveryRequired: "Bir kurtarma kodu girin.", recoveryIncorrect: "Kurtarma kodu yanlış.", password: "Parola", passwordHelp: "Kurioticket hesap parolanızı kullanın.", passwordRequired: "Parolanızı girin.", passwordIncorrect: "Parola yanlış." },
  pl: { onTitle: "Uwierzytelnianie dwuskładnikowe jest włączone", onBody: "Twoje konto jest chronione przez aplikację uwierzytelniającą.", authenticatorApp: "Aplikacja uwierzytelniająca", turnOff: "Wyłącz uwierzytelnianie dwuskładnikowe", verifyTitle: "Potwierdź, że to Ty", verifyBody: "Aby kontynuować, potwierdź swoją tożsamość.", authenticatorCode: "Kod z aplikacji", authenticatorPlaceholder: "6-cyfrowy kod", authenticatorRequired: "Wpisz 6-cyfrowy kod z aplikacji uwierzytelniającej.", authenticatorIncorrect: "Kod z aplikacji jest nieprawidłowy.", useAnother: "Użyj innej metody weryfikacji", chooseMethod: "Wybierz metodę weryfikacji", recoveryCode: "Kod odzyskiwania", recoveryHelp: "Użyj jednego z zapisanych kodów odzyskiwania.", recoveryRequired: "Wpisz kod odzyskiwania.", recoveryIncorrect: "Kod odzyskiwania jest nieprawidłowy.", password: "Hasło", passwordHelp: "Użyj hasła do konta Kurioticket.", passwordRequired: "Wpisz hasło.", passwordIncorrect: "Hasło jest nieprawidłowe." },
  sv: { onTitle: "Tvåfaktorsautentisering är aktiverad", onBody: "Ditt konto skyddas med en autentiseringsapp.", authenticatorApp: "Autentiseringsapp", turnOff: "Stäng av tvåfaktorsautentisering", verifyTitle: "Verifiera att det är du", verifyBody: "Verifiera att det är du för att fortsätta.", authenticatorCode: "Autentiseringskod", authenticatorPlaceholder: "6-siffrig kod", authenticatorRequired: "Ange den 6-siffriga koden från din autentiseringsapp.", authenticatorIncorrect: "Autentiseringskoden är felaktig.", useAnother: "Använd en annan verifieringsmetod", chooseMethod: "Välj verifieringsmetod", recoveryCode: "Återställningskod", recoveryHelp: "Använd en av dina sparade återställningskoder.", recoveryRequired: "Ange en återställningskod.", recoveryIncorrect: "Återställningskoden är felaktig.", password: "Lösenord", passwordHelp: "Använd lösenordet för ditt Kurioticket-konto.", passwordRequired: "Ange ditt lösenord.", passwordIncorrect: "Lösenordet är felaktigt." },
  id: { onTitle: "Autentikasi dua faktor aktif", onBody: "Akun Anda dilindungi dengan aplikasi autentikator.", authenticatorApp: "Aplikasi autentikator", turnOff: "Matikan autentikasi dua faktor", verifyTitle: "Verifikasi bahwa ini Anda", verifyBody: "Untuk melanjutkan, verifikasi bahwa ini Anda.", authenticatorCode: "Kode autentikator", authenticatorPlaceholder: "Kode 6 digit", authenticatorRequired: "Masukkan kode 6 digit dari aplikasi autentikator Anda.", authenticatorIncorrect: "Kode autentikator salah.", useAnother: "Gunakan metode verifikasi lain", chooseMethod: "Pilih metode verifikasi", recoveryCode: "Kode pemulihan", recoveryHelp: "Gunakan salah satu kode pemulihan yang Anda simpan.", recoveryRequired: "Masukkan kode pemulihan.", recoveryIncorrect: "Kode pemulihan salah.", password: "Kata sandi", passwordHelp: "Gunakan kata sandi akun Kurioticket Anda.", passwordRequired: "Masukkan kata sandi Anda.", passwordIncorrect: "Kata sandi salah." },
  th: { onTitle: "เปิดการยืนยันตัวตนแบบสองปัจจัยแล้ว", onBody: "บัญชีของคุณได้รับการปกป้องด้วยแอปยืนยันตัวตน", authenticatorApp: "แอปยืนยันตัวตน", turnOff: "ปิดการยืนยันตัวตนแบบสองปัจจัย", verifyTitle: "ยืนยันว่าเป็นคุณ", verifyBody: "เพื่อดำเนินการต่อ โปรดยืนยันว่าเป็นคุณ", authenticatorCode: "รหัสจากแอปยืนยันตัวตน", authenticatorPlaceholder: "รหัส 6 หลัก", authenticatorRequired: "ป้อนรหัส 6 หลักจากแอปยืนยันตัวตนของคุณ", authenticatorIncorrect: "รหัสจากแอปยืนยันตัวตนไม่ถูกต้อง", useAnother: "ใช้วิธียืนยันอื่น", chooseMethod: "เลือกวิธียืนยัน", recoveryCode: "รหัสกู้คืน", recoveryHelp: "ใช้รหัสกู้คืนที่คุณบันทึกไว้หนึ่งรหัส", recoveryRequired: "ป้อนรหัสกู้คืน", recoveryIncorrect: "รหัสกู้คืนไม่ถูกต้อง", password: "รหัสผ่าน", passwordHelp: "ใช้รหัสผ่านบัญชี Kurioticket ของคุณ", passwordRequired: "ป้อนรหัสผ่านของคุณ", passwordIncorrect: "รหัสผ่านไม่ถูกต้อง" },
  vi: { onTitle: "Xác thực hai yếu tố đang bật", onBody: "Tài khoản của bạn được bảo vệ bằng ứng dụng xác thực.", authenticatorApp: "Ứng dụng xác thực", turnOff: "Tắt xác thực hai yếu tố", verifyTitle: "Xác minh đó là bạn", verifyBody: "Để tiếp tục, hãy xác minh đó là bạn.", authenticatorCode: "Mã ứng dụng xác thực", authenticatorPlaceholder: "Mã 6 chữ số", authenticatorRequired: "Nhập mã 6 chữ số từ ứng dụng xác thực của bạn.", authenticatorIncorrect: "Mã ứng dụng xác thực không đúng.", useAnother: "Dùng phương thức xác minh khác", chooseMethod: "Chọn phương thức xác minh", recoveryCode: "Mã khôi phục", recoveryHelp: "Dùng một trong các mã khôi phục bạn đã lưu.", recoveryRequired: "Nhập mã khôi phục.", recoveryIncorrect: "Mã khôi phục không đúng.", password: "Mật khẩu", passwordHelp: "Dùng mật khẩu tài khoản Kurioticket của bạn.", passwordRequired: "Nhập mật khẩu của bạn.", passwordIncorrect: "Mật khẩu không đúng." },
};

function EyeIcon({ hidden, color }: { hidden: boolean; color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Circle cx="12" cy="12" r="2.7" fill="none" stroke={color} strokeWidth={1.8} />{hidden ? <Line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth={1.8} strokeLinecap="round" /> : null}</Svg>;
}

export function TwoFactorEnabledFlow({ active, hasPassword, copy: c, onUnauthorized, onDisabled }: Props) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const f = flowCopy[locale];
  const [stage, setStage] = useState<Stage>("overview");
  const [method, setMethod] = useState<VerificationMethod>("authenticator");
  const [showMethods, setShowMethods] = useState(false);
  const [verification, setVerification] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passwordHidden, setPasswordHidden] = useState(true);

  const reset = () => {
    setStage("overview");
    setMethod("authenticator");
    setShowMethods(false);
    setVerification("");
    setFieldError("");
    setGeneralError("");
    setSubmitting(false);
    setPasswordHidden(true);
  };

  useEffect(() => {
    if (!active) reset();
  }, [active]);

  useEffect(() => {
    if (!hasPassword && method === "password") {
      setMethod("authenticator");
      setVerification("");
      setFieldError("");
      setGeneralError("");
      setPasswordHidden(true);
    }
  }, [hasPassword, method]);

  const chooseMethod = (next: VerificationMethod) => {
    Keyboard.dismiss();
    setMethod(next);
    setVerification("");
    setFieldError("");
    setGeneralError("");
    setPasswordHidden(true);
    setShowMethods(false);
  };

  const beginDisable = () => {
    setStage("verify");
    chooseMethod("authenticator");
  };

  const verifyInput = () => {
    if (method === "authenticator") {
      if (!/^\d{6}$/.test(verification)) return f.authenticatorRequired;
      return "";
    }
    if (!verification.trim()) return method === "recovery" ? f.recoveryRequired : f.passwordRequired;
    return "";
  };

  const performDisable = async () => {
    if (submitting) return;
    const error = verifyInput();
    if (error) { setFieldError(error); return; }
    setSubmitting(true);
    setFieldError("");
    setGeneralError("");
    try {
      await travelApi.disableTwoFactor(method === "password" ? { password: verification } : { code: verification });
      Keyboard.dismiss();
      const message = `${c.twoFactor}: ${c.disabled}`;
      AccessibilityInfo.announceForAccessibility(message);
      await onDisabled();
    } catch (e) {
      if (!await onUnauthorized(e)) {
        if (e instanceof TravelApiError && e.status === 403) {
          setFieldError(method === "authenticator" ? f.authenticatorIncorrect : method === "recovery" ? f.recoveryIncorrect : f.passwordIncorrect);
        } else {
          setGeneralError(e instanceof TravelApiError ? e.message : c.twoFactorError);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDisable = () => {
    const error = verifyInput();
    if (error) { setFieldError(error); return; }
    Alert.alert(c.disableTitle, c.disableBody, [
      { text: c.cancel, style: "cancel" },
      { text: c.disable, style: "destructive", onPress: () => void performDisable() },
    ]);
  };

  if (stage === "overview") {
    return <View style={styles.form}>
      <View style={styles.statusHeading}>
        <View style={styles.checkCircle}><Text style={styles.checkText}>✓</Text></View>
        <Text accessibilityRole="header" style={[styles.stageTitle, { color: theme.text }]}>{f.onTitle}</Text>
      </View>
      <Text style={[styles.supporting, { color: theme.muted }]}>{f.onBody}</Text>
      <View style={[styles.methodStatus, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.methodTitle, { color: theme.text }]}>{f.authenticatorApp}</Text>
        <Text style={styles.enabled}>{c.enabled}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={beginDisable} style={({ pressed }) => [styles.dangerOutline, pressed && styles.pressed]}>
        <Text style={styles.dangerOutlineText}>{f.turnOff}</Text>
      </Pressable>
    </View>;
  }

  const fieldLabel = method === "authenticator" ? f.authenticatorCode : method === "recovery" ? f.recoveryCode : f.password;
  const methodHelp = method === "recovery" ? f.recoveryHelp : method === "password" ? f.passwordHelp : "";
  const ready = method === "authenticator" ? /^\d{6}$/.test(verification) : Boolean(verification.trim());

  return <View style={styles.form}>
    <Text accessibilityRole="header" style={[styles.stageTitle, { color: theme.text }]}>{f.verifyTitle}</Text>
    <Text style={[styles.supporting, { color: theme.muted }]}>{f.verifyBody}</Text>
    {methodHelp ? <Text style={[styles.methodHelp, { color: theme.muted }]}>{methodHelp}</Text> : null}
    {generalError ? <Text accessibilityRole="alert" style={styles.error}>{generalError}</Text> : null}

    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.text }]}>{fieldLabel}</Text>
      <View style={[styles.inputShell, { borderColor: fieldError ? flowColors.red : theme.border, backgroundColor: theme.surface }]}>
        <TextInput
          accessibilityLabel={fieldLabel}
          keyboardType={method === "authenticator" ? "number-pad" : "default"}
          maxLength={method === "authenticator" ? 6 : undefined}
          secureTextEntry={method === "password" && passwordHidden}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={method === "password" ? "password" : "none"}
          value={verification}
          onChangeText={(value) => {
            setVerification(method === "authenticator" ? value.replace(/\D/g, "") : value);
            setFieldError("");
            setGeneralError("");
          }}
          placeholder={method === "authenticator" ? f.authenticatorPlaceholder : fieldLabel}
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text }]}
        />
        {method === "password" ? <Pressable accessibilityRole="button" accessibilityLabel={passwordHidden ? `${c.show}: ${fieldLabel}` : `${c.hide}: ${fieldLabel}`} onPress={() => setPasswordHidden((current) => !current)} style={styles.eyeButton}><EyeIcon hidden={passwordHidden} color={theme.muted} /></Pressable> : null}
      </View>
      <View style={styles.fieldFeedback}>{fieldError ? <Text accessibilityRole="alert" style={styles.error}>{fieldError}</Text> : null}</View>
    </View>

    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready || submitting, busy: submitting }} disabled={!ready || submitting} onPress={confirmDisable} style={({ pressed }) => [styles.dangerButton, (!ready || submitting) && styles.dangerDisabled, pressed && ready && !submitting && styles.pressed]}>
      <View style={styles.buttonContent}><Text style={styles.dangerButtonText}>{f.turnOff}</Text>{submitting ? <ActivityIndicator size="small" color="white" /> : null}</View>
    </Pressable>

    <Pressable accessibilityRole="button" onPress={() => setShowMethods((current) => !current)} style={styles.secondaryAction}>
      <Text style={styles.link}>{f.useAnother}</Text>
    </Pressable>

    {showMethods ? <View style={[styles.methodPicker, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text style={[styles.methodPickerTitle, { color: theme.text }]}>{f.chooseMethod}</Text>
      <MethodOption title={f.authenticatorApp} detail={f.authenticatorPlaceholder} selected={method === "authenticator"} onPress={() => chooseMethod("authenticator")} />
      <MethodOption title={f.recoveryCode} detail={f.recoveryHelp} selected={method === "recovery"} onPress={() => chooseMethod("recovery")} />
      {hasPassword ? <MethodOption title={f.password} detail={f.passwordHelp} selected={method === "password"} onPress={() => chooseMethod("password")} /> : null}
    </View> : null}
  </View>;
}

function MethodOption({ title, detail, selected, onPress }: { title: string; detail: string; selected: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.methodOption, { borderTopColor: theme.border }, pressed && styles.pressed]}>
    <View style={styles.methodOptionCopy}><Text style={[styles.methodTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.methodDetail, { color: theme.muted }]}>{detail}</Text></View>
    {selected ? <Text style={styles.selectedMark}>✓</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  statusHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E9F7EF", alignItems: "center", justifyContent: "center" },
  checkText: { color: "#067647", fontSize: 17, fontWeight: "900" },
  stageTitle: { flexShrink: 1, fontSize: 20, lineHeight: 27, fontWeight: "800" },
  supporting: { fontSize: 15, lineHeight: 22 },
  methodHelp: { fontSize: 14, lineHeight: 20, marginTop: -4 },
  methodStatus: { minHeight: 64, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  methodTitle: { flexShrink: 1, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  enabled: { color: "#067647", fontSize: 14, fontWeight: "800" },
  dangerOutline: { minHeight: 52, borderRadius: 11, borderWidth: 1, borderColor: flowColors.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 8 },
  dangerOutlineText: { color: flowColors.red, fontSize: 16, fontWeight: "800", textAlign: "center" },
  fieldGroup: { gap: 7 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  inputShell: { minHeight: 54, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, minHeight: 52, paddingHorizontal: 14, paddingVertical: 0, fontSize: 16 },
  eyeButton: { width: 48, minHeight: 52, alignItems: "center", justifyContent: "center" },
  fieldFeedback: { minHeight: 20, justifyContent: "center" },
  error: { color: "#B42318", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  dangerButton: { minHeight: 52, borderRadius: 11, backgroundColor: flowColors.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  dangerDisabled: { backgroundColor: "#E7A5A5" },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  dangerButtonText: { color: "white", fontSize: 16, fontWeight: "800", textAlign: "center" },
  secondaryAction: { minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 8 },
  link: { color: "#1769E0", fontSize: 15, fontWeight: "800", textAlign: "center" },
  methodPicker: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  methodPickerTitle: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontWeight: "800" },
  methodOption: { minHeight: 68, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 12 },
  methodOptionCopy: { flex: 1, gap: 3 },
  methodDetail: { fontSize: 13, lineHeight: 18 },
  selectedMark: { color: "#1769E0", fontSize: 17, fontWeight: "900" },
  pressed: { opacity: 0.68 },
});