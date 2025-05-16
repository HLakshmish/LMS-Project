import React, { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  windowHeight: number;
  overscan?: number;
  className?: string;
  loadMore?: () => void;
  hasMore?: boolean;
  loadingComponent?: React.ReactNode;
}

function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  windowHeight,
  overscan = 5,
  className = '',
  loadMore,
  hasMore = false,
  loadingComponent = <div className="py-4 text-center">Loading more items...</div>
}: VirtualizedListProps<T>) {
  // Calculate the total height of all items
  const totalHeight = items.length * itemHeight;
  
  // State to track scroll position
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate which items should be visible
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + windowHeight) / itemHeight) + overscan
  );
  
  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  // Handle scroll event
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  // Set up intersection observer for infinite loading
  const { ref, inView } = useInView({
    threshold: 0.1,
  });
  
  // Load more items when bottom is reached
  useEffect(() => {
    if (inView && hasMore && loadMore) {
      loadMore();
    }
  }, [inView, hasMore, loadMore]);
  
  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: windowHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
        {hasMore && (
          <div ref={ref} style={{ width: '100%', height: 20 }}>
            {loadingComponent}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(VirtualizedList);
