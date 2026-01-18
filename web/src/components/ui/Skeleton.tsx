import './Skeleton.css';

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  inline?: boolean;
};

function toCssSize(v: number | string | undefined) {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function Skeleton({ width, height, radius, className, inline }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: toCssSize(width),
    height: toCssSize(height),
    borderRadius: toCssSize(radius),
  };

  return (
    <span
      className={[
        'skel',
        inline ? 'skel--text' : '',
        className || '',
      ].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}

type SkeletonValueProps = {
  loading: boolean;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
};

/**
 * Shows a skeleton while `loading === true`, but keeps children in DOM (hidden),
 * so layout doesn't jump. Great for "default values" approach.
 */
export function SkeletonValue({
  loading,
  children,
  width = '100%',
  height = '1em',
  radius = 10,
  className,
}: SkeletonValueProps) {
  return (
    <span className={['skel-value', loading ? 'is-loading' : '', className || ''].filter(Boolean).join(' ')}>
      <span className="skel-value__content">{children}</span>
      {loading && (
        <span className="skel-value__overlay">
          <Skeleton width={width} height={height} radius={radius} inline />
        </span>
      )}
    </span>
  );
}

