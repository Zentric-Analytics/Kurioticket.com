"use client";

import { type ReactNode, type RefObject } from "react";

import { FlightMobilePickerShell, type FlightMobilePickerRequestClose } from "@/components/search/FlightMobilePickerShell";

type HotelMobilePickerShellProps = {
  open: boolean;
  title: string;
  titleId: string;
  dialogId?: string;
  launcherRef?: RefObject<HTMLElement | null>;
  children: ReactNode | ((requestClose: FlightMobilePickerRequestClose) => ReactNode);
  footer?: ReactNode | ((requestClose: FlightMobilePickerRequestClose) => ReactNode);
  onClose: () => void;
  className?: string;
  contentClassName?: string;
  headerVariant?: "navigation" | "close";
  showCancelAction?: boolean;
  showBackLabel?: boolean;
};

export function HotelMobilePickerShell(props: HotelMobilePickerShellProps) {
  return <FlightMobilePickerShell {...props} />;
}
