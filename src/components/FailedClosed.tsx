import SplitFlapText from "./bits/SplitFlapText";

export default function FailedClosed() {
  return (
    <SplitFlapText
      text="404"
      fontSize="clamp(64px, 14vw, 156px)"
      tileColor="var(--surface)"
      textColor="var(--strong)"
      tileRadius={6}
      loop={false}
      padTo={3}
      intro
    />
  );
}
