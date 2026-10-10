"use client";

import { QRCodeSVG } from "qrcode.react";
import React from "react";

/** Encode the setup secret locally; never send it to an image or QR service. */
export function AuthenticatorQrCode({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={192} marginSize={4} title="Authenticator app QR code" role="img" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />;
}
