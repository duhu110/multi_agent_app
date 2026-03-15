import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { RawStreamEvent } from "@/lib/test-assistant-ui/types";

export function RawEventPanel({ events }: { events: RawStreamEvent[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="raw-events">
        <AccordionTrigger>Raw events ({events.length})</AccordionTrigger>
        <AccordionContent>
          <div className="max-h-80 space-y-2 overflow-auto rounded border p-2 text-xs">
            {events.length === 0 ? <p className="text-muted-foreground">No events yet.</p> : null}
            {events
              .slice()
              .reverse()
              .map((event, index) => (
                <pre key={`${event.seq}-${event.ts}-${index}`} className="bg-muted overflow-auto rounded p-2">
{`#${event.seq} ${event.eventType} @ ${event.ts}\n${JSON.stringify(event.raw, null, 2)}`}
                </pre>
              ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
