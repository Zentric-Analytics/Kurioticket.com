import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import {
  securityPasswordChangeApi,
  type PasswordChangeChallenge,
} from "../../api/securityPasswordChangeApi";
import { TravelApiError } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../../theme/AppTheme";
import type { SecurityCopy } from "./securityLocalization";

type Props = {
  active: boolean;
  copy: SecurityCopy;
  recoveryLabel: string;
  recoveryHelp: string;
  onRecovery: () => void;
  onUnauthorized: (error: unknown) => Promise<boolean>;
  onSuccess: () => Promise<void>;
};

type PasswordKey = "currentPassword" | "newPassword" | "confirmPassword";

type FlowCopy = {
  verifyTitle: string;
  verifyBody: (maskedEmail: string) => string;
  codeLabel: string;
  verifyAction: string;
  resend: string;
  resendIn: (seconds: number) => string;
  codeSent: string;
  expiredHint: string;
  recoveryUnlocked: string;
};

const mmss = (seconds: number) => `00:${String(seconds).padStart(2, "0")}`;

const flowCopies: Record<MobileLocale, FlowCopy> = {
  "en-us": { verifyTitle: "Verify it’s you", verifyBody: (email) => `Enter the 6-digit code we sent to ${email}. The code expires in 5 minutes.`, codeLabel: "Verification code", verifyAction: "Verify and change password", resend: "Request new code", resendIn: (s) => `Request new code in ${mmss(s)}`, codeSent: "New code sent.", expiredHint: "If the code expires, start the password change again.", recoveryUnlocked: "Still can’t get in? You can now reset your password another way." },
  "es-es": { verifyTitle: "Verifica que eres tú", verifyBody: (email) => `Introduce el código de 6 dígitos que enviamos a ${email}. El código caduca en 5 minutos.`, codeLabel: "Código de verificación", verifyAction: "Verificar y cambiar contraseña", resend: "Solicitar un código nuevo", resendIn: (s) => `Solicitar un código nuevo en ${mmss(s)}`, codeSent: "Se envió un código nuevo.", expiredHint: "Si el código caduca, vuelve a iniciar el cambio de contraseña.", recoveryUnlocked: "¿Sigues sin poder acceder? Ahora puedes restablecer la contraseña de otra forma." },
  fr: { verifyTitle: "Vérifiez votre identité", verifyBody: (email) => `Saisissez le code à 6 chiffres envoyé à ${email}. Il expire dans 5 minutes.`, codeLabel: "Code de vérification", verifyAction: "Vérifier et changer le mot de passe", resend: "Demander un nouveau code", resendIn: (s) => `Nouveau code dans ${mmss(s)}`, codeSent: "Nouveau code envoyé.", expiredHint: "Si le code expire, recommencez le changement de mot de passe.", recoveryUnlocked: "Toujours bloqué ? Vous pouvez maintenant réinitialiser votre mot de passe autrement." },
  "de-de": { verifyTitle: "Bestätigen Sie Ihre Identität", verifyBody: (email) => `Geben Sie den 6-stelligen Code ein, den wir an ${email} gesendet haben. Er läuft in 5 Minuten ab.`, codeLabel: "Bestätigungscode", verifyAction: "Bestätigen und Passwort ändern", resend: "Neuen Code anfordern", resendIn: (s) => `Neuen Code anfordern in ${mmss(s)}`, codeSent: "Neuer Code gesendet.", expiredHint: "Wenn der Code abläuft, starten Sie die Passwortänderung erneut.", recoveryUnlocked: "Noch kein Zugriff? Sie können Ihr Passwort jetzt auf einem anderen Weg zurücksetzen." },
  "it-it": { verifyTitle: "Verifica la tua identità", verifyBody: (email) => `Inserisci il codice di 6 cifre inviato a ${email}. Il codice scade tra 5 minuti.`, codeLabel: "Codice di verifica", verifyAction: "Verifica e cambia password", resend: "Richiedi un nuovo codice", resendIn: (s) => `Richiedi un nuovo codice tra ${mmss(s)}`, codeSent: "Nuovo codice inviato.", expiredHint: "Se il codice scade, avvia di nuovo la modifica della password.", recoveryUnlocked: "Non riesci ancora ad accedere? Ora puoi reimpostare la password in un altro modo." },
  "pt-br": { verifyTitle: "Verifique sua identidade", verifyBody: (email) => `Digite o código de 6 dígitos enviado para ${email}. O código expira em 5 minutos.`, codeLabel: "Código de verificação", verifyAction: "Verificar e alterar senha", resend: "Solicitar novo código", resendIn: (s) => `Solicitar novo código em ${mmss(s)}`, codeSent: "Novo código enviado.", expiredHint: "Se o código expirar, inicie a alteração de senha novamente.", recoveryUnlocked: "Ainda não consegue entrar? Agora você pode redefinir a senha de outra forma." },
  nl: { verifyTitle: "Controleer dat u het bent", verifyBody: (email) => `Voer de 6-cijferige code in die we naar ${email} hebben gestuurd. De code verloopt over 5 minuten.`, codeLabel: "Verificatiecode", verifyAction: "Verifiëren en wachtwoord wijzigen", resend: "Nieuwe code aanvragen", resendIn: (s) => `Nieuwe code aanvragen over ${mmss(s)}`, codeSent: "Nieuwe code verzonden.", expiredHint: "Als de code verloopt, start u de wachtwoordwijziging opnieuw.", recoveryUnlocked: "Kunt u nog steeds niet inloggen? U kunt uw wachtwoord nu op een andere manier opnieuw instellen." },
  ar: { verifyTitle: "تحقق من هويتك", verifyBody: (email) => `أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه إلى ${email}. تنتهي صلاحية الرمز خلال 5 دقائق.`, codeLabel: "رمز التحقق", verifyAction: "تحقق وغيّر كلمة المرور", resend: "طلب رمز جديد", resendIn: (s) => `طلب رمز جديد خلال ${mmss(s)}`, codeSent: "تم إرسال رمز جديد.", expiredHint: "إذا انتهت صلاحية الرمز، ابدأ تغيير كلمة المرور من جديد.", recoveryUnlocked: "ما زلت لا تستطيع الدخول؟ يمكنك الآن إعادة تعيين كلمة المرور بطريقة أخرى." },
  "zh-cn": { verifyTitle: "验证是您本人", verifyBody: (email) => `请输入我们发送到 ${email} 的 6 位验证码。验证码将在 5 分钟后过期。`, codeLabel: "验证码", verifyAction: "验证并更改密码", resend: "获取新验证码", resendIn: (s) => `${mmss(s)} 后可获取新验证码`, codeSent: "新验证码已发送。", expiredHint: "如果验证码过期，请重新开始更改密码。", recoveryUnlocked: "仍然无法登录？您现在可以通过其他方式重置密码。" },
  ja: { verifyTitle: "本人確認", verifyBody: (email) => `${email} に送信した6桁のコードを入力してください。コードは5分で期限切れになります。`, codeLabel: "確認コード", verifyAction: "確認してパスワードを変更", resend: "新しいコードをリクエスト", resendIn: (s) => `${mmss(s)} 後に新しいコードをリクエスト`, codeSent: "新しいコードを送信しました。", expiredHint: "コードの期限が切れた場合は、パスワード変更を最初からやり直してください。", recoveryUnlocked: "まだサインインできませんか？別の方法でパスワードをリセットできます。" },
  ko: { verifyTitle: "본인 확인", verifyBody: (email) => `${email}로 보낸 6자리 코드를 입력하세요. 코드는 5분 후 만료됩니다.`, codeLabel: "인증 코드", verifyAction: "인증하고 비밀번호 변경", resend: "새 코드 요청", resendIn: (s) => `${mmss(s)} 후 새 코드 요청`, codeSent: "새 코드를 보냈습니다.", expiredHint: "코드가 만료되면 비밀번호 변경을 다시 시작하세요.", recoveryUnlocked: "아직 로그인할 수 없나요? 이제 다른 방법으로 비밀번호를 재설정할 수 있습니다." },
  hi: { verifyTitle: "पुष्टि करें कि यह आप हैं", verifyBody: (email) => `${email} पर भेजा गया 6 अंकों का कोड दर्ज करें। कोड 5 मिनट में समाप्त हो जाएगा।`, codeLabel: "सत्यापन कोड", verifyAction: "सत्यापित करें और पासवर्ड बदलें", resend: "नया कोड मांगें", resendIn: (s) => `${mmss(s)} में नया कोड मांगें`, codeSent: "नया कोड भेज दिया गया।", expiredHint: "कोड समाप्त हो जाए तो पासवर्ड बदलने की प्रक्रिया फिर से शुरू करें।", recoveryUnlocked: "अभी भी साइन इन नहीं कर पा रहे हैं? अब आप दूसरे तरीके से पासवर्ड रीसेट कर सकते हैं।" },
  tr: { verifyTitle: "Siz olduğunuzu doğrulayın", verifyBody: (email) => `${email} adresine gönderdiğimiz 6 haneli kodu girin. Kod 5 dakika içinde sona erer.`, codeLabel: "Doğrulama kodu", verifyAction: "Doğrula ve şifreyi değiştir", resend: "Yeni kod iste", resendIn: (s) => `${mmss(s)} sonra yeni kod iste`, codeSent: "Yeni kod gönderildi.", expiredHint: "Kodun süresi dolarsa şifre değiştirme işlemini yeniden başlatın.", recoveryUnlocked: "Hâlâ giriş yapamıyor musunuz? Artık şifrenizi başka bir yöntemle sıfırlayabilirsiniz." },
  pl: { verifyTitle: "Potwierdź, że to Ty", verifyBody: (email) => `Wpisz 6-cyfrowy kod wysłany na ${email}. Kod wygaśnie za 5 minut.`, codeLabel: "Kod weryfikacyjny", verifyAction: "Zweryfikuj i zmień hasło", resend: "Poproś o nowy kod", resendIn: (s) => `Nowy kod za ${mmss(s)}`, codeSent: "Wysłano nowy kod.", expiredHint: "Jeśli kod wygaśnie, rozpocznij zmianę hasła ponownie.", recoveryUnlocked: "Nadal nie możesz się zalogować? Możesz teraz zresetować hasło w inny sposób." },
  sv: { verifyTitle: "Verifiera att det är du", verifyBody: (email) => `Ange den 6-siffriga koden vi skickade till ${email}. Koden går ut om 5 minuter.`, codeLabel: "Verifieringskod", verifyAction: "Verifiera och byt lösenord", resend: "Begär ny kod", resendIn: (s) => `Begär ny kod om ${mmss(s)}`, codeSent: "Ny kod skickad.", expiredHint: "Om koden går ut, börja lösenordsbytet igen.", recoveryUnlocked: "Kan du fortfarande inte logga in? Du kan nu återställa lösenordet på ett annat sätt." },
  id: { verifyTitle: "Verifikasi bahwa ini Anda", verifyBody: (email) => `Masukkan kode 6 digit yang kami kirim ke ${email}. Kode akan kedaluwarsa dalam 5 menit.`, codeLabel: "Kode verifikasi", verifyAction: "Verifikasi dan ubah kata sandi", resend: "Minta kode baru", resendIn: (s) => `Minta kode baru dalam ${mmss(s)}`, codeSent: "Kode baru telah dikirim.", expiredHint: "Jika kode kedaluwarsa, mulai kembali proses perubahan kata sandi.", recoveryUnlocked: "Masih tidak bisa masuk? Sekarang Anda dapat mengatur ulang kata sandi dengan cara lain." },
  th: { verifyTitle: "ยืนยันว่าเป็นคุณ", verifyBody: (email) => `กรอกรหัส 6 หลักที่เราส่งไปยัง ${email} รหัสจะหมดอายุใน 5 นาที`, codeLabel: "รหัสยืนยัน", verifyAction: "ยืนยันและเปลี่ยนรหัสผ่าน", resend: "ขอรหัสใหม่", resendIn: (s) => `ขอรหัสใหม่ได้ใน ${mmss(s)}`, codeSent: "ส่งรหัสใหม่แล้ว", expiredHint: "หากรหัสหมดอายุ ให้เริ่มเปลี่ยนรหัสผ่านใหม่อีกครั้ง", recoveryUnlocked: "ยังเข้าสู่ระบบไม่ได้ใช่ไหม? ตอนนี้คุณสามารถรีเซ็ตรหัสผ่านด้วยวิธีอื่นได้" },
  vi: { verifyTitle: "Xác minh đó là bạn", verifyBody: (email) => `Nhập mã 6 chữ số chúng tôi đã gửi đến ${email}. Mã sẽ hết hạn sau 5 phút.`, codeLabel: "Mã xác minh", verifyAction: "Xác minh và đổi mật khẩu", resend: "Yêu cầu mã mới", resendIn: (s) => `Yêu cầu mã mới sau ${mmss(s)}`, codeSent: "Đã gửi mã mới.", expiredHint: "Nếu mã hết hạn, hãy bắt đầu lại việc đổi mật khẩu.", recoveryUnlocked: "Vẫn chưa đăng nhập được? Giờ bạn có thể đặt lại mật khẩu bằng cách khác." },
};

function EyeIcon({ hidden, color }: { hidden: boolean; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="2.7" fill="none" stroke={color} strokeWidth={1.8} />
      {hidden ? <Line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth={1.8} strokeLinecap="round" /> : null}
    </Svg>
  );
}

function PasswordField({ label, value, hidden, onChange, onToggle, showLabel, hideLabel, returnKeyType }: { label: string; value: string; hidden: boolean; onChange: (value: string) => void; onToggle: () => void; showLabel: string; hideLabel: string; returnKeyType?: "next" | "done"; }) {
  const { theme } = useAppTheme();
  return <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text><View style={[styles.passwordInputShell, { borderColor: theme.border, backgroundColor: theme.surface }]}><TextInput accessibilityLabel={label} secureTextEntry={hidden} value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} textContentType="password" returnKeyType={returnKeyType} style={[styles.passwordInput, { color: theme.text }]} /><Pressable accessibilityRole="button" accessibilityLabel={hidden ? `${showLabel}: ${label}` : `${hideLabel}: ${label}`} accessibilityState={{ expanded: !hidden }} hitSlop={8} onPress={onToggle} style={styles.eyeButton}><EyeIcon hidden={hidden} color={theme.muted} /></Pressable></View></View>;
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void; }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ busy: loading, disabled: loading }} disabled={loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, loading && styles.disabled, pressed && !loading && styles.pressed]}><View style={styles.primaryContent}><Text style={styles.primaryText}>{label}</Text>{loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}</View></Pressable>;
}

export function PasswordChangeFlow({ active, copy, recoveryLabel, recoveryHelp, onRecovery, onUnauthorized, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const f = flowCopies[locale];
  const requestGeneration = useRef(0);
  const [stage, setStage] = useState<"form" | "verify">("form");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [hidden, setHidden] = useState<Record<PasswordKey, boolean>>({ currentPassword: true, newPassword: true, confirmPassword: true });
  const [challenge, setChallenge] = useState<PasswordChangeChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [resendUntil, setResendUntil] = useState(0);
  const [resendRemaining, setResendRemaining] = useState(0);

  const clearAll = () => { requestGeneration.current += 1; setStage("form"); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); setHidden({ currentPassword: true, newPassword: true, confirmPassword: true }); setChallenge(null); setCode(""); setError(""); setMessage(""); setSubmitting(false); setRecoveryAvailable(false); setResendUntil(0); setResendRemaining(0); };

  useEffect(() => {
    if (!active) { clearAll(); return; }
    const generation = ++requestGeneration.current;
    setStage("form"); setError(""); setMessage(""); setCode(""); setChallenge(null); setResendUntil(0); setResendRemaining(0);
    void securityPasswordChangeApi.status().then((status) => { if (generation === requestGeneration.current) setRecoveryAvailable(status.recoveryAvailable); }).catch(async (e) => { if (generation !== requestGeneration.current) return; await onUnauthorized(e); });
    return () => { requestGeneration.current += 1; };
  }, [active, onUnauthorized]);

  useEffect(() => {
    if (!active || stage !== "verify" || !resendUntil) return;
    const update = () => setResendRemaining(Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 250); return () => clearInterval(timer);
  }, [active, resendUntil, stage]);

  const patch = (key: PasswordKey, value: string) => { setPasswords((current) => ({ ...current, [key]: value })); setError(""); setMessage(""); };
  const formReady = Boolean(passwords.currentPassword) && passwords.newPassword.length >= 8 && passwords.confirmPassword.length >= 8 && passwords.newPassword === passwords.confirmPassword && passwords.currentPassword !== passwords.newPassword;

  const start = async () => {
    if (submitting) return;
    if (!formReady) { setError(copy.passwordInvalid); return; }
    const generation = requestGeneration.current; setSubmitting(true); setError(""); setMessage("");
    try {
      const result = await securityPasswordChangeApi.start(passwords);
      if (generation !== requestGeneration.current) return;
      Keyboard.dismiss(); setChallenge(result); setPasswords((current) => ({ ...current, currentPassword: "" })); setRecoveryAvailable(false); setCode(""); setResendUntil(Date.now() + result.resendAfterSeconds * 1000); setStage("verify"); AccessibilityInfo.announceForAccessibility(f.verifyBody(result.maskedEmail));
    } catch (e) {
      if (generation !== requestGeneration.current || await onUnauthorized(e)) return;
      if (e instanceof TravelApiError) { const details = e.details ?? {}; if (details.recoveryAvailable === true) setRecoveryAvailable(true); setError(e.message); } else setError(copy.loadError);
    } finally { if (generation === requestGeneration.current) setSubmitting(false); }
  };

  const resend = async () => {
    if (submitting || !challenge || resendRemaining > 0) return;
    const generation = requestGeneration.current; setSubmitting(true); setError(""); setMessage("");
    try {
      const result = await securityPasswordChangeApi.resend({ challengeId: challenge.challengeId, newPassword: passwords.newPassword });
      if (generation !== requestGeneration.current) return;
      setChallenge(result); setCode(""); setResendUntil(Date.now() + result.resendAfterSeconds * 1000); setMessage(f.codeSent); AccessibilityInfo.announceForAccessibility(f.codeSent);
    } catch (e) {
      if (generation !== requestGeneration.current || await onUnauthorized(e)) return;
      if (e instanceof TravelApiError) { const retryAfter = (e as TravelApiError & { retryAfterSeconds?: number }).retryAfterSeconds; if (e.status === 429 && retryAfter) setResendUntil(Date.now() + retryAfter * 1000); if (e.status === 410) { setStage("form"); setChallenge(null); setCode(""); } setError(e.message); } else setError(copy.loadError);
    } finally { if (generation === requestGeneration.current) setSubmitting(false); }
  };

  const confirm = async () => {
    if (submitting || !challenge) return;
    if (!/^\d{6}$/.test(code)) { setError(copy.codeInvalid); return; }
    const generation = requestGeneration.current; setSubmitting(true); setError(""); setMessage("");
    try {
      await securityPasswordChangeApi.confirm({ challengeId: challenge.challengeId, code, newPassword: passwords.newPassword, confirmPassword: passwords.confirmPassword });
      if (generation !== requestGeneration.current) return;
      Keyboard.dismiss(); AccessibilityInfo.announceForAccessibility(copy.passwordSuccess); await onSuccess();
    } catch (e) { if (generation !== requestGeneration.current || await onUnauthorized(e)) return; setError(e instanceof TravelApiError ? e.message : copy.loadError); } finally { if (generation === requestGeneration.current) setSubmitting(false); }
  };

  if (stage === "verify" && challenge) {
    return <View style={styles.form}><View style={styles.verifyIntro}><Text accessibilityRole="header" style={[styles.verifyTitle, { color: theme.text }]}>{f.verifyTitle}</Text><Text style={[styles.supporting, { color: theme.muted }]}>{f.verifyBody(challenge.maskedEmail)}</Text></View>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}<View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: theme.text }]}>{f.codeLabel}</Text><TextInput accessibilityLabel={f.codeLabel} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "")); setError(""); setMessage(""); }} autoFocus style={[styles.codeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} /></View><PrimaryButton label={f.verifyAction} loading={submitting} onPress={() => void confirm()} /><Pressable accessibilityRole="button" accessibilityState={{ disabled: resendRemaining > 0 || submitting }} disabled={resendRemaining > 0 || submitting} onPress={() => void resend()} style={({ pressed }) => [styles.resendAction, pressed && resendRemaining === 0 && styles.pressed]}><Text style={[styles.resendText, { color: resendRemaining > 0 ? theme.muted : "#1769E0" }]}>{resendRemaining > 0 ? f.resendIn(resendRemaining) : f.resend}</Text></Pressable><Text style={[styles.expiryHint, { color: theme.muted }]}>{f.expiredHint}</Text></View>;
  }

  return <View style={styles.form}><Text style={[styles.rules, { color: theme.muted }]}>{copy.passwordRules}</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<PasswordField label={copy.current} value={passwords.currentPassword} hidden={hidden.currentPassword} onChange={(value) => patch("currentPassword", value)} onToggle={() => setHidden((current) => ({ ...current, currentPassword: !current.currentPassword }))} showLabel={copy.show} hideLabel={copy.hide} returnKeyType="next" /><PasswordField label={copy.next} value={passwords.newPassword} hidden={hidden.newPassword} onChange={(value) => patch("newPassword", value)} onToggle={() => setHidden((current) => ({ ...current, newPassword: !current.newPassword }))} showLabel={copy.show} hideLabel={copy.hide} returnKeyType="next" /><PasswordField label={copy.confirm} value={passwords.confirmPassword} hidden={hidden.confirmPassword} onChange={(value) => patch("confirmPassword", value)} onToggle={() => setHidden((current) => ({ ...current, confirmPassword: !current.confirmPassword }))} showLabel={copy.show} hideLabel={copy.hide} returnKeyType="done" /><PrimaryButton label={copy.change} loading={submitting} onPress={() => void start()} />{recoveryAvailable ? <View style={[styles.recovery, { borderTopColor: theme.border }]}><Text style={[styles.supporting, { color: theme.muted }]}>{f.recoveryUnlocked}</Text><Pressable accessibilityRole="button" accessibilityLabel={recoveryLabel} onPress={onRecovery} style={styles.recoveryAction}><Text style={styles.link}>{recoveryLabel}</Text></Pressable><Text style={[styles.recoveryHelp, { color: theme.muted }]}>{recoveryHelp}</Text></View> : null}</View>;
}

const styles = StyleSheet.create({
  form: { gap: 16 }, rules: { fontSize: 14, lineHeight: 21, marginBottom: 2 }, fieldGroup: { gap: 7 }, fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: "700" }, passwordInputShell: { minHeight: 52, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center" }, passwordInput: { minHeight: 50, flex: 1, fontSize: 16, paddingHorizontal: 13, paddingVertical: 0 }, eyeButton: { width: 48, minHeight: 50, alignItems: "center", justifyContent: "center" }, primaryButton: { minHeight: 52, borderRadius: 11, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", marginTop: 4 }, primaryContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.68 }, error: { color: "#B42318", fontSize: 14, lineHeight: 20, fontWeight: "600" }, success: { color: "#067647", fontSize: 14, lineHeight: 20, fontWeight: "700" }, verifyIntro: { gap: 7, marginBottom: 2 }, verifyTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800" }, supporting: { fontSize: 14, lineHeight: 21 }, codeInput: { minHeight: 56, borderWidth: 1, borderRadius: 11, paddingHorizontal: 16, fontSize: 22, fontWeight: "700", letterSpacing: 9, textAlign: "center" }, resendAction: { minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 8 }, resendText: { fontSize: 14, fontWeight: "700" }, expiryHint: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: -8 }, recovery: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 18, gap: 5 }, recoveryAction: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" }, link: { color: "#1769E0", fontWeight: "800" }, recoveryHelp: { fontSize: 13, lineHeight: 19, marginTop: -5 },
});
