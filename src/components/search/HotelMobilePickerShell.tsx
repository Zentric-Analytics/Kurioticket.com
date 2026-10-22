"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./HotelAppPickers.module.css";

import { type ReactNode, type RefObject } from "react";

import { FlightMobilePickerShell, type FlightMobilePickerRequestClose } from "@/components/search/FlightMobilePickerShell";

type HotelMobilePickerShellProps = {
  open: boolean;
  appearance?: "default" | "app";
  title: string;
  titleId: string;
  dialogId?: string;
  launcherRef?: RefObject<HTMLElement | null>;
  children: ReactNode | ((requestClose: FlightMobilePickerRequestClose) => ReactNode);
  footer?: ReactNode | ((requestClose: FlightMobilePickerRequestClose) => ReactNode);
  onClose: () => void;
  className?: string;
  contentClassName?: string;
  headerVariant?: "navigation" | "close" | "close-right";
  showCancelAction?: boolean;
  showBackLabel?: boolean;
  showBackAction?: boolean;
};

export function HotelMobilePickerShell(props: HotelMobilePickerShellProps) {
  const { appearance, ...rest } = props;
  return <FlightMobilePickerShell {...rest} {...(appearance === "app" ? { className: cn(styles.full, rest.className), showBackLabel: true, showCancelAction: false, backIcon: <ChevronLeft size={20} aria-hidden="true" /> } : {})} />;
}
