"use client";

import { type ReactNode, type RefObject } from "react";

import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";

type HotelMobilePickerShellProps = {
  open: boolean;
  title: string;
  titleId: string;
  launcherRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  contentClassName?: string;
};

export function HotelMobilePickerShell(props: HotelMobilePickerShellProps) {
  return <FlightMobilePickerShell {...props} />;
}
