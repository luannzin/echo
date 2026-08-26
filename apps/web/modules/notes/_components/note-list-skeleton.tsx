import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows match the real row geometry, so nothing shifts when the notes arrive. */
export const NoteListSkeleton = () => (
  <>
    <p role="status" className="sr-only">
      Loading your notes…
    </p>
    <ul aria-hidden="true" className="space-y-1.5 px-2 pt-1">
      {[70, 45, 60, 35].map((width, index) => (
        <li key={width}>
          <Skeleton
            className="h-4"
            style={{ width: `${width}%`, animationDelay: `${index * 60}ms` }}
          />
        </li>
      ))}
    </ul>
  </>
);
