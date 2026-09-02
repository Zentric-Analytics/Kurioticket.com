import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { TravelApiError } from "../../api/travelApi";
import { securityPasswordResetApi, type PasswordResetChallenge } from "../../api/securityPasswordResetApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../../theme/AppTheme";
import type { SecurityCopy } from "./securityLocalization";
import { passwordFlowCopy } from "./passwordFlowLocalization";

type Props = {
  active: boolean;
  copy: SecurityCopy;
  intro?: string;
  onUnauthorized: (error: unknown) => Promise<boolean>;
  onSuccess: () => Promise<void>;
};

type ResetNavigationCopy = {
  title: string;
  entry: string;
  entryHelp: string;
  back: string;
  submit: string;
  success: string;
};

const resetNavigationCopy: Record<MobileLocale, ResetNavigationCopy> = {
  "en-us": { title: "Reset password", entry: "Reset password another way", entryHelp: "Verify your account by email and choose a new password.", back: "Back to change password", submit: "Reset password", success: "Password reset. Other devices were signed out." },
  "es-es": { title: "Restablecer contraseña", entry: "Restablecer contraseña de otra forma", entryHelp: "Verifica tu cuenta por correo electrónico y elige una nueva contraseña.", back: "Volver a cambiar contraseña", submit: "Restablecer contraseña", success: "Contraseña restablecida. Se cerraron las otras sesiones." },
  fr: { title: "Réinitialiser le mot de passe", entry: "Réinitialiser le mot de passe autrement", entryHelp: "Vérifiez votre compte par e-mail et choisissez un nouveau mot de passe.", back: "Retour au changement de mot de passe", submit: "Réinitialiser le mot de passe", success: "Mot de passe réinitialisé. Les autres appareils ont été déconnectés." },
  "de-de": { title: "Passwort zurücksetzen", entry: "Passwort auf andere Weise zurücksetzen", entryHelp: "Bestätige dein Konto per E-Mail und wähle ein neues Passwort.", back: "Zurück zum Passwort ändern", submit: "Passwort zurücksetzen", success: "Passwort zurückgesetzt. Andere Geräte wurden abgemeldet." },
  "it-it": { title: "Reimposta password", entry: "Reimposta password in un altro modo", entryHelp: "Verifica il tuo account via email e scegli una nuova password.", back: "Torna a cambia password", submit: "Reimposta password", success: "Password reimpostata. Gli altri dispositivi sono stati disconnessi." },
  "pt-br": { title: "Redefinir senha", entry: "Redefinir senha de outra forma", entryHelp: "Verifique sua conta por e-mail e escolha uma nova senha.", back: "Voltar para alterar senha", submit: "Redefinir senha", success: "Senha redefinida. Outros dispositivos foram desconectados." },
  nl: { title: "Wachtwoord opnieuw instellen", entry: "Wachtwoord op een andere manier opnieuw instellen", entryHelp: "Verifieer je account via e-mail en kies een nieuw wachtwoord.", back: "Terug naar wachtwoord wijzigen", submit: "Wachtwoord opnieuw instellen", success: "Wachtwoord opnieuw ingesteld. Andere apparaten zijn afgemeld." },
  ar: { title: "إعادة تعيين كلمة المرور", entry: "إعادة تعيين كلمة المرور بطريقة أخرى", entryHelp: "تحقق من حسابك عبر البريد الإلكتروني واختر كلمة مرور جديدة.", back: "العودة إلى تغيير كلمة المرور", submit: "إعادة تعيين كلمة المرور", success: "تمت إعادة تعيين كلمة المرور وتسجيل خروج الأجهزة الأخرى." },
  "zh-cn": { title: "重置密码", entry: "通过其他方式重置密码", entryHelp: "通过电子邮箱验证账户并设置新密码。", back: "返回更改密码", submit: "重置密码", success: "密码已重置，其他设备已退出登录。" },
  ja: { title: "パスワードをリセット", entry: "別の方法でパスワードをリセット", entryHelp: "メールでアカウントを確認し、新しいパスワードを設定します。", back: "パスワード変更に戻る", submit: "パスワードをリセット", success: "パスワードをリセットしました。他のデバイスはサインアウトされました。" },
  ko: { title: "비밀번호 재설정", entry: "다른 방법으로 비밀번호 재설정", entryHelp: "이메일로 계정을 확인하고 새 비밀번호를 설정하세요.", back: "비밀번호 변경으로 돌아가기", submit: "비밀번호 재설정", success: "비밀번호가 재설정되었습니다. 다른 기기에서 로그아웃되었습니다." },
  hi: { title: "पासवर्ड रीसेट करें", entry: "दूसरे तरीके से पासवर्ड रीसेट करें", entryHelp: "ईमेल से अपने खाते की पुष्टि करें और नया पासवर्ड चुनें।", back: "पासवर्ड बदलने पर वापस जाएँ", submit: "पासवर्ड रीसेट करें", success: "पासवर्ड रीसेट हो गया। अन्य डिवाइस साइन आउट कर दिए गए।" },
  tr: { title: "Parolayı sıfırla", entry: "Parolayı başka bir yolla sıfırla", entryHelp: "Hesabınızı e-postayla doğrulayın ve yeni bir parola seçin.", back: "Parola değiştirmeye dön", submit: "Parolayı sıfırla", success: "Parola sıfırlandı. Diğer cihazların oturumu kapatıldı." },
  pl: { title: "Zresetuj hasło", entry: "Zresetuj hasło w inny sposób", entryHelp: "Zweryfikuj konto przez e-mail i wybierz nowe hasło.", back: "Wróć do zmiany hasła", submit: "Zresetuj hasło", success: "Hasło zresetowano. Inne urządzenia zostały wylogowane." },
  sv: { title: "Återställ lösenord", entry: "Återställ lösenord på ett annat sätt", entryHelp: "Verifiera ditt konto via e-post och välj ett nytt lösenord.", back: "Tillbaka till ändra lösenord", submit: "Återställ lösenord", success: "Lösenordet har återställts. Andra enheter har loggats ut." },
  id: { title: "Atur ulang kata sandi", entry: "Atur ulang kata sandi dengan cara lain", entryHelp: "Verifikasi akun melalui email dan pilih kata sandi baru.", back: "Kembali ke ubah kata sandi", submit: "Atur ulang kata sandi", success: "Kata sandi diatur ulang. Perangkat lain telah keluar." },
  th: { title: "รีเซ็ตรหัสผ่าน", entry: "รีเซ็ตรหัสผ่านด้วยวิธีอื่น", entryHelp: "ยืนยันบัญชีผ่านอีเมลและเลือกรหัสผ่านใหม่", back: "กลับไปเปลี่ยนรหัสผ่าน", submit: "รีเซ็ตรหัสผ่าน", success: "รีเซ็ตรหัสผ่านแล้ว อุปกรณ์อื่นถูกออกจากระบบ" },
  vi: { title: "Đặt lại mật khẩu", entry: "Đặt lại mật khẩu theo cách khác", entryHelp: "Xác minh tài khoản qua email và chọn mật khẩu mới.", back: "Quay lại đổi mật khẩu", submit: "Đặt lại mật khẩu", success: "Đã đặt lại mật khẩu. Các thiết bị khác đã đăng xuất." },
};

export function passwordResetNavigationCopy(locale: MobileLocale) { return resetNavigationCopy[locale]; }

function EyeIcon({ hidden, color }: { hidden: boolean; color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Circle cx="12" cy="12" r="2.7" fill="none" stroke={color} strokeWidth={1.8} />{hidden ? <Line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth={1.8} strokeLinecap="round" /> : null}</Svg>;
}

function PasswordField({ label, value, hidden, error, showLabel, hideLabel, onChange, onToggle }: { label: string; value: string; hidden: boolean; error?: string; showLabel: string; hideLabel: string; onChange: (value: string) => void; onToggle: () => void }) {
  const { theme } = useAppTheme();
  return <View style={styles.fieldGroup}><Text style={[styles.label, { color: theme.text }]}>{label}</Text><View style={[styles.passwordShell, { backgroundColor: theme.surface, borderColor: error ? "#B42318" : theme.border }]}><TextInput accessibilityLabel={label} secureTextEntry={hidden} value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" style={[styles.passwordInput, { color: theme.text }]} /><Pressable accessibilityRole="button" accessibilityLabel={hidden ? `${showLabel}: ${label}` : `${hideLabel}: ${label}`} onPress={onToggle} style={styles.eyeButton}><EyeIcon hidden={hidden} color={theme.muted} /></Pressable></View><View style={styles.fieldFeedback}>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View></View>;
}

function Button({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, loading && styles.disabled, pressed && !loading && styles.pressed]}><View style={styles.buttonContent}><Text style={styles.buttonText}>{label}</Text>{loading ? <ActivityIndicator size="small" color="white" /> : null}</View></Pressable>;
}

export function PasswordResetFlow({ active, copy: c, intro, onUnauthorized, onSuccess }: Props) {
  const { theme } = useAppTheme(); const { locale } = useMobileLocalization(); const f = passwordFlowCopy[locale]; const navigationCopy = passwordResetNavigationCopy(locale);
  const [stage, setStage] = useState<"sending" | "verify" | "create">("sending"); const [challenge, setChallenge] = useState<PasswordResetChallenge | null>(null); const [code, setCode] = useState(""); const [codeError, setCodeError] = useState(""); const [recoveryToken, setRecoveryToken] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [newError, setNewError] = useState(""); const [confirmError, setConfirmError] = useState(""); const [generalError, setGeneralError] = useState(""); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false); const [hidden, setHidden] = useState({ newPassword: true, confirmPassword: true }); const [resendUntil, setResendUntil] = useState(0); const [resendRemaining, setResendRemaining] = useState(0); const activeRef = useRef(active); const generationRef = useRef(0); const inFlightRef = useRef(false);

  const clearAll = () => { generationRef.current += 1; inFlightRef.current = false; setStage("sending"); setChallenge(null); setCode(""); setCodeError(""); setRecoveryToken(""); setNewPassword(""); setConfirmPassword(""); setNewError(""); setConfirmError(""); setGeneralError(""); setMessage(""); setSubmitting(false); setHidden({ newPassword: true, confirmPassword: true }); setResendUntil(0); setResendRemaining(0); };

  const sendCode = async () => {
    if (inFlightRef.current) return; const generation = generationRef.current; inFlightRef.current = true; setSubmitting(true); setGeneralError(""); setCodeError(""); setMessage("");
    try { const result = await securityPasswordResetApi.sendCode(); if (!activeRef.current || generation !== generationRef.current) return; setChallenge(result); setCode(""); setStage("verify"); setResendUntil(Date.now() + result.resendAfterSeconds * 1000); AccessibilityInfo.announceForAccessibility(f.verifyBody(result.maskedEmail)); }
    catch (e) { if (!activeRef.current || generation !== generationRef.current) return; if (!await onUnauthorized(e)) { if (e instanceof TravelApiError) { const retryAfter = (e as TravelApiError & { retryAfterSeconds?: number }).retryAfterSeconds; if (e.status === 429 && retryAfter) setResendUntil(Date.now() + retryAfter * 1000); setGeneralError(e.message); } else setGeneralError(c.loadError); } }
    finally { inFlightRef.current = false; if (activeRef.current && generation === generationRef.current) setSubmitting(false); }
  };

  useEffect(() => { activeRef.current = active; if (!active) { clearAll(); return; } generationRef.current += 1; setStage("sending"); setGeneralError(""); setCodeError(""); setMessage(""); void sendCode(); return () => { generationRef.current += 1; }; }, [active]);
  useEffect(() => { if (!active || stage !== "verify" || !resendUntil) return; const update = () => setResendRemaining(Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000))); update(); const timer = setInterval(update, 250); return () => clearInterval(timer); }, [active, resendUntil, stage]);

  const verifyCode = async () => {
    if (inFlightRef.current) return; if (!/^\d{6}$/.test(code)) { setCodeError(c.codeInvalid); return; } const generation = generationRef.current; inFlightRef.current = true; setSubmitting(true); setCodeError(""); setGeneralError("");
    try { const result = await securityPasswordResetApi.verifyCode(code); if (!activeRef.current || generation !== generationRef.current) return; setRecoveryToken(result.recoveryToken); setStage("create"); setCode(""); setChallenge(null); setResendUntil(0); setResendRemaining(0); AccessibilityInfo.announceForAccessibility(f.createTitle); }
    catch (e) { if (!activeRef.current || generation !== generationRef.current) return; if (!await onUnauthorized(e)) { if (e instanceof TravelApiError && (e.details?.field === "verificationCode" || e.status === 400)) setCodeError(e.message); else setGeneralError(e instanceof TravelApiError ? e.message : c.loadError); } }
    finally { inFlightRef.current = false; if (activeRef.current && generation === generationRef.current) setSubmitting(false); }
  };

  const resetPassword = async () => {
    if (inFlightRef.current) return; const nextError = newPassword.length < 8 ? f.newTooShort : ""; const confirmationError = !confirmPassword ? f.confirmRequired : newPassword !== confirmPassword ? f.confirmMismatch : ""; setNewError(nextError); setConfirmError(confirmationError); if (nextError || confirmationError) return;
    const generation = generationRef.current; let restartVerification = false; inFlightRef.current = true; setSubmitting(true); setGeneralError("");
    try { await securityPasswordResetApi.reset({ recoveryToken, newPassword, confirmPassword }); if (!activeRef.current || generation !== generationRef.current) return; AccessibilityInfo.announceForAccessibility(navigationCopy.success); await onSuccess(); }
    catch (e) { if (!activeRef.current || generation !== generationRef.current) return; if (!await onUnauthorized(e)) { if (e instanceof TravelApiError && e.status === 410) { setRecoveryToken(""); setNewPassword(""); setConfirmPassword(""); setNewError(""); setConfirmError(""); setGeneralError(""); setStage("sending"); restartVerification = true; } else if (e instanceof TravelApiError && (e.details?.field === "newPassword" || e.message.includes("different from your current"))) setNewError(f.newSame); else setGeneralError(e instanceof TravelApiError ? e.message : c.loadError); } }
    finally { inFlightRef.current = false; if (activeRef.current && generation === generationRef.current) { setSubmitting(false); if (restartVerification) void sendCode(); } }
  };

  if (stage === "sending") return <View style={styles.sending}>{intro ? <Text style={[styles.supporting, { color: theme.muted }]}>{intro}</Text> : null}<ActivityIndicator size="small" color="#1769E0" />{generalError ? <><Text accessibilityRole="alert" style={styles.error}>{generalError}</Text><Pressable accessibilityRole="button" onPress={() => void sendCode()} style={styles.retryAction}><Text style={styles.link}>{c.retry}</Text></Pressable></> : null}</View>;
  if (stage === "verify" && challenge) return <View style={styles.form}><Text accessibilityRole="header" style={[styles.stageTitle, { color: theme.text }]}>{f.verifyTitle}</Text><Text style={[styles.supporting, { color: theme.muted }]}>{f.verifyBody(challenge.maskedEmail)}</Text>{generalError ? <Text accessibilityRole="alert" style={styles.error}>{generalError}</Text> : null}{message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}<View style={styles.fieldGroup}><Text style={[styles.label, { color: theme.text }]}>{f.codeLabel}</Text><TextInput accessibilityLabel={f.codeLabel} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "")); setCodeError(""); setGeneralError(""); }} autoFocus style={[styles.codeInput, { color: theme.text, backgroundColor: theme.surface, borderColor: codeError ? "#B42318" : theme.border }]} /><View style={styles.fieldFeedback}>{codeError ? <Text accessibilityRole="alert" style={styles.error}>{codeError}</Text> : null}</View></View><Button label={f.continueAction} loading={submitting} onPress={() => void verifyCode()} /><Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting || resendRemaining > 0 }} disabled={submitting || resendRemaining > 0} onPress={() => void sendCode()} style={styles.resendAction}><Text style={[styles.link, resendRemaining > 0 && { color: theme.muted }]}>{resendRemaining > 0 ? f.resendIn(resendRemaining) : f.resend}</Text></Pressable><Text style={[styles.expiry, { color: theme.muted }]}>{f.expiryHint}</Text></View>;
  return <View style={styles.form}><Text accessibilityRole="header" style={[styles.stageTitle, { color: theme.text }]}>{f.createTitle}</Text><Text style={[styles.supporting, { color: theme.muted }]}>{c.passwordRules}</Text>{generalError ? <Text accessibilityRole="alert" style={styles.error}>{generalError}</Text> : null}<PasswordField label={c.next} value={newPassword} hidden={hidden.newPassword} error={newError} showLabel={c.show} hideLabel={c.hide} onChange={(value) => { setNewPassword(value); setNewError(""); setGeneralError(""); }} onToggle={() => setHidden((current) => ({ ...current, newPassword: !current.newPassword }))} /><PasswordField label={c.confirm} value={confirmPassword} hidden={hidden.confirmPassword} error={confirmError} showLabel={c.show} hideLabel={c.hide} onChange={(value) => { setConfirmPassword(value); setConfirmError(""); setGeneralError(""); }} onToggle={() => setHidden((current) => ({ ...current, confirmPassword: !current.confirmPassword }))} /><Button label={navigationCopy.submit} loading={submitting} onPress={() => void resetPassword()} /></View>;
}

const styles = StyleSheet.create({ form: { gap: 12 }, sending: { gap: 16, alignItems: "center", paddingVertical: 18 }, stageTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800" }, supporting: { fontSize: 14, lineHeight: 21 }, fieldGroup: { gap: 7 }, label: { fontSize: 14, lineHeight: 20, fontWeight: "700" }, fieldFeedback: { minHeight: 20, justifyContent: "center" }, codeInput: { minHeight: 56, borderWidth: 1, borderRadius: 11, paddingHorizontal: 16, fontSize: 22, fontWeight: "700", letterSpacing: 9, textAlign: "center" }, passwordShell: { minHeight: 52, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center" }, passwordInput: { minHeight: 50, flex: 1, fontSize: 16, paddingHorizontal: 13, paddingVertical: 0 }, eyeButton: { width: 48, minHeight: 50, alignItems: "center", justifyContent: "center" }, button: { minHeight: 52, borderRadius: 11, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", marginTop: 2 }, buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, buttonText: { color: "white", fontSize: 16, fontWeight: "800" }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.68 }, error: { color: "#B42318", fontSize: 14, lineHeight: 20, fontWeight: "600" }, success: { color: "#067647", fontSize: 14, lineHeight: 20, fontWeight: "700" }, resendAction: { minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 8 }, retryAction: { minHeight: 44, justifyContent: "center" }, link: { color: "#1769E0", fontSize: 15, fontWeight: "800" }, expiry: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: -8 } });
