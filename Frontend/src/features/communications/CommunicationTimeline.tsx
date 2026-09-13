import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Phone,
  Calendar,
  StickyNote,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { communicationsApi, Communication } from '../../api/communications';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const typeConfig: Record<
  string,
  { icon: React.ElementType; dotColor: string; bgColor: string; textColor: string }
> = {
  email: { icon: Mail, dotColor: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  call: { icon: Phone, dotColor: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  meeting: {
    icon: Calendar,
    dotColor: 'bg-purple-500',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  note: { icon: StickyNote, dotColor: 'bg-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  message: { icon: MessageSquare, dotColor: 'bg-gray-400', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
};

interface CommunicationTimelineProps {
  relatedType: string;
  relatedId: string;
}

export function CommunicationTimeline({ relatedType, relatedId }: CommunicationTimelineProps) {
  const [items, setItems] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTimeline = useCallback(
    async (pageNum: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await communicationsApi.getTimeline(relatedType, relatedId, {
          page: pageNum,
          limit: 10,
        });
        if (res.success && res.data) {
          setItems((prev) => (append ? [...prev, ...res.data.data] : res.data.data));
          setTotalPages(res.data.totalPages);
        }
      } catch {
        // silently fail for timeline embeds
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [relatedType, relatedId]
  );

  useEffect(() => {
    fetchTimeline(1);
  }, [fetchTimeline]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTimeline(next, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading timeline...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <MessageSquare className="w-8 h-8" />
        <p className="text-sm">No communications yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-0">
        {items.map((comm) => {
          const cfg = typeConfig[comm.type] || typeConfig.message;
          const Icon = cfg.icon;
          const showDirection = ['email', 'call'].includes(comm.type) && comm.direction;

          return (
            <div key={comm._id} className="relative flex gap-4 py-4 group">
              {/* Dot */}
              <div className="relative z-10 flex-shrink-0 mt-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${cfg.bgColor} ring-4 ring-background`}
                >
                  <Icon className={`w-4 h-4 ${cfg.textColor}`} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {comm.subject && (
                        <span className="font-medium text-sm truncate">{comm.subject}</span>
                      )}
                      {showDirection && (
                        <Badge
                          variant={comm.direction === 'inbound' ? 'default' : 'secondary'}
                          className="gap-1 text-[10px] px-1.5 py-0"
                        >
                          {comm.direction === 'inbound' ? (
                            <ArrowDownLeft className="w-2.5 h-2.5" />
                          ) : (
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          )}
                          {comm.direction}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {comm.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(comm.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {comm.user && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {comm.user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-xs text-muted-foreground">{comm.user.name}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="gap-1 text-muted-foreground"
          >
            {loadingMore ? (
              'Loading...'
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Load more
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
