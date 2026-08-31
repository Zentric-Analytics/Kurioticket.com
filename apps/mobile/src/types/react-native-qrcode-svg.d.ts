declare module "react-native-qrcode-svg" {
  import type { ComponentType } from "react";

  type QRCodeProps = {
    backgroundColor?: string;
    quietZone?: number;
    size?: number;
    value: string;
  };

  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
}
