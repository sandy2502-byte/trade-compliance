export default function ComplianceBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Clear:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Review:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Restricted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.Clear}`}
    >
      {status}
    </span>
  );
}
