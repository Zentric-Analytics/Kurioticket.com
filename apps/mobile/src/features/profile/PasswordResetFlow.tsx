import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { TravelApiError } from "../../api/travelApi";
import { securityPasswordResetApi } from "../../api/securityPasswordResetApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../../theme/AppTheme";
import type { SecurityCopy } from "./securityLocalization";

type Props = {
  active: boolean;
  copy: SecurityCopy;
  intro?: string;
  onUnauthorized: (error: unknown) => Promise<boolean>;
  onSuccess: () => Promise<void>;
};

const codeActionCopy: Record<MobileLocale, { send: string; resend: string; sent: string; field: string }> = {
  "en-us": { send: "Send verification code", resend: "Resend verification code", sent: "A 6-digit verification code was sent to your verified account email. It expires in 5 minutes.", field: "Verification code" },
  "es-es": { send: "Enviar código de verificación", resend: "Reenviar código de verificación", sent: "Se envió un código de verificación de 6 dígitos al correo verificado de tu cuenta. Caduca en 5 minutos.", field: "Código de verificación" },
  fr: { send: "Envoyer le code de vérification", resend: "Renvoyer le code de vérification", sent: "Un code de vérification à 6 chiffres a été envoyé à l’adresse e-mail vérifiée de votre compte. Il expire dans 5 minutes.", field: "Code de vérification" },
  "de-de": { send: "Bestätigungscode senden", resend: "Bestätigungscode erneut senden", sent: "Ein 6-stelliger Bestätigungscode wurde an die bestätigte E-Mail-Adresse deines Kontos gesendet. Er läuft in 5 Minuten ab.", field: "Bestätigungscode" },
  "it-it": { send: "Invia codice di verifica", resend: "Invia di nuovo il codice", sent: "Un codice di verifica di 6 cifre è stato inviato all'email verificata del tuo account. Scade tra 5 minuti.", field: "Codice di verifica" },
  "pt-br": { send: "Enviar código de verificação", resend: "Reenviar código de verificação", sent: "Um código de verificação de 6 dígitos foi enviado para o e-mail verificado da sua conta. Ele expira em 5 minutos.", field: "Código de verificação" },
  nl: { send: "Verificatiecode verzenden", resend: "Verificatiecode opnieuw verzenden", sent: "Er is een verificatiecode van 6 cijfers naar het geverifieerde e-mailadres van je account gestuurd. De code verloopt over 5 minuten.", field: "Verificatiecode" },
  ar: { send: "إرسال رمز التحقق", resend: "إعادة إرسال رمز التحقق", sent: "تم إرسال رمز تحقق مكوّن من 6 أرقام إلى البريد الإلكتروني الموثق لحسابك. تنتهي صلاحيته خلال 5 دقائق.", field: "رمز التحقق" },
  "zh-cn": { send: "发送验证码", resend: "重新发送验证码", sent: "6 位验证码已发送到您账户已验证的电子邮箱。验证码将在 5 分钟后过期。", field: "验证码" },
  ja: { send: "確認コードを送信", resend: "確認コードを再送信", sent: "6桁の確認コードを、アカウントで確認済みのメールアドレスに送信しました。5分後に期限切れになります。", field: "確認コード" },
  ko: { send: "인증 코드 보내기", resend: "인증 코드 다시 보내기", sent: "6자리 인증 코드를 계정의 인증된 이메일로 보냈습니다. 5분 후 만료됩니다.", field: "인증 코드" },
  hi: { send: "सत्यापन कोड भेजें", resend: "सत्यापन कोड फिर भेजें", sent: "6 अंकों का सत्यापन कोड आपके खाते के सत्यापित ईमेल पर भेजा गया है। यह 5 मिनट में समाप्त हो जाएगा।", field: "सत्यापन कोड" },
  tr: { send: "Doğrulama kodu gönder", resend: "Doğrulama kodunu yeniden gönder", sent: "6 haneli doğrulama kodu hesabınızın doğrulanmış e-posta adresine gönderildi. Kod 5 dakika içinde sona erer.", field: "Doğrulama kodu" },
  pl: { send: "Wyślij kod weryfikacyjny", resend: "Wyślij kod ponownie", sent: "6-cyfrowy kod weryfikacyjny został wysłany na zweryfikowany adres e-mail konta. Kod wygaśnie za 5 minut.", field: "Kod weryfikacyjny" },
  sv: { send: "Skicka verifieringskod", resend: "Skicka verifieringskoden igen", sent: "En 6-siffrig verifieringskod skickades till kontots verifierade e-postadress. Den upphör att gälla om 5 minuter.", field: "Verifieringskod" },
  id: { send: "Kirim kode verifikasi", resend: "Kirim ulang kode verifikasi", sent: "Kode verifikasi 6 digit telah dikirim ke email akun Anda yang telah diverifikasi. Kode kedaluwarsa dalam 5 menit.", field: "Kode verifikasi" },
  th: { send: "ส่งรหัสยืนยัน", resend: "ส่งรหัสยืนยันอีกครั้ง", sent: "ส่งรหัสยืนยัน 6 หลักไปยังอีเมลที่ยืนยันแล้วของบัญชีคุณ รหัสจะหมดอายุใน 5 นาที", field: "รหัสยืนยัน" },
  vi: { send: "Gửi mã xác minh", resend: "Gửi lại mã xác minh", sent: "Mã xác minh gồm 6 chữ số đã được gửi đến email đã xác minh của tài khoản. Mã sẽ hết hạn sau 5 phút.", field: "Mã xác minh" },
};

export function passwordResetNavigationCopy(locale: MobileLocale) {
  if (locale === "es-es") {
    return {
      title: "Restablecer contraseña",
      entry: "Restablecer contraseña de otra forma",
      entryHelp: "Verifica tu cuenta por correo electrónico y elige una nueva contraseña.",
      back: "Volver a cambiar contraseña",
      submit: "Restablecer contraseña",
      success: "Contraseña restablecida. Se cerraron las otras sesiones.",
    } as const;
  }
  return {
    title: "Reset password",
    entry: "Reset password another way",
    entryHelp: "Verify your account by email and choose a new password.",
    back: "Back to change password",
    submit: "Reset password",
    success: "Password reset. Other devices were signed out.",
  } as const;
}

export function PasswordResetFlow({ active, copy: c, intro, onUnauthorized, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const actionCopy = codeActionCopy[locale];
  const navigationCopy = passwordResetNavigationCopy(locale);
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) return;
    setStage("request");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
    setSubmitting(false);
    setVisible(false);
  }, [active]);

  const sendCode = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await securityPasswordResetApi.sendCode();
      setStage("verify");
      setMessage(actionCopy.sent);
      AccessibilityInfo.announceForAccessibility(actionCopy.send);
    } catch (e) {
      if (!await onUnauthorized(e)) setError(e instanceof TravelApiError ? e.message : c.loadError);
    } finally {
      setSubmitting(false);
    }
  };

  const resetReady = /^\d{6}$/.test(code) && newPassword.length >= 8 && confirmPassword.length >= 8 && newPassword === confirmPassword;

  const resetPassword = async () => {
    if (submitting) return;
    if (!/^\d{6}$/.test(code)) { setError(c.codeInvalid); return; }
    if (newPassword.length < 8 || newPassword !== confirmPassword) { setError(c.passwordInvalid); return; }
    setSubmitting(true);
    setError("");
    try {
      await securityPasswordResetApi.reset({ code, newPassword, confirmPassword });
      AccessibilityInfo.announceForAccessibility(navigationCopy.success);
      await onSuccess();
    } catch (e) {
      if (!await onUnauthorized(e)) setError(e instanceof TravelApiError ? e.message : c.loadError);
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "request") {
    return <View style={styles.form}>
      <Text style={{ color: theme.muted }}>{intro ?? c.oauth}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button label={submitting ? c.loading : actionCopy.send} disabled={submitting} onPress={() => void sendCode()} />
    </View>;
  }

  return <View style={styles.form}>
    {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <TextInput accessibilityLabel={actionCopy.field} keyboardType="number-pad" maxLength={6} value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "")); setError(""); }} placeholder={actionCopy.field} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
    <TextInput accessibilityLabel={c.next} secureTextEntry={!visible} value={newPassword} onChangeText={(value) => { setNewPassword(value); setError(""); }} placeholder={c.next} placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
    <TextInput accessibilityLabel={c.confirm} secureTextEntry={!visible} value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(""); }} placeholder={c.confirm} placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? c.hide : c.show} onPress={() => setVisible((value) => !value)} style={styles.textAction}><Text style={styles.link}>{visible ? c.hide : c.show}</Text></Pressable>
    <Text style={{ color: theme.muted }}>{c.passwordRules}</Text>
    <Button label={submitting ? c.changing : navigationCopy.submit} disabled={submitting || !resetReady} onPress={() => void resetPassword()} />
    <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void sendCode()} style={styles.textAction}><Text style={styles.link}>{actionCopy.resend}</Text></Pressable>
  </View>;
}

function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  textAction: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" },
  link: { color: "#1769E0", fontWeight: "700" },
  button: { minHeight: 50, borderRadius: 10, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
  disabled: { opacity: 0.45 },
  buttonText: { color: "white", fontWeight: "800" },
  error: { color: "#B42318", fontWeight: "600" },
  success: { color: "#067647", fontWeight: "600" },
  pressed: { opacity: 0.65 },
});
