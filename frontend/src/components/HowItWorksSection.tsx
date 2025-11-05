import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  User,
  Users,
  Briefcase,
  Mail,
  FileText,
  BarChart3,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

export default function HowItWorksSection() {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const steps = [
    {
      number: "1",
      title: "Add Your Info",
      description:
        "Set up your freelancer profile (name, address, contact info).",
      benefit:
        "This info will automatically appear on all your invoices.",
      icon: User,
    },
    {
      number: "2",
      title: "Add Client Info",
      description:
        "Save your client details (name, email, address).",
      benefit:
        "No need to re-type for future invoices – just select from your saved list.",
      icon: Users,
    },
    {
      number: "3",
      title: "Add Service Info",
      description:
        "List your services with prices, VAT, and descriptions.",
      benefit:
        "Quickly add services to invoices without re-entering details.",
      icon: Briefcase,
    },
    {
      number: "4",
      title: "Create Email Templates",
      description:
        "Write email templates with placeholders (e.g., {{customerName}}, {{invoiceNumber}}).",
      benefit:
        "Send invoices with a professional, personalized message in one click.",
      icon: Mail,
    },
    {
      number: "5",
      title: "Create & Send Invoices",
      description:
        "Generate invoices, attach PDFs, and send them directly to clients by email.",
      benefit:
        "Everything is automated – no manual downloads or attachments needed.",
      icon: FileText,
    },
    {
      number: "6",
      title: "Hybrid E-Invoice (ZUGFeRD/Factur-X)",
      description:
        "Create a human-readable PDF/A-3 with embedded EN 16931 XML.",
      benefit:
        "Meets Germany’s E-Rechnung standards and supports the 2025–2028 rollout.",
      icon: ShieldCheck,
    },
    {
      number: "7",
      title: "Track & Manage Overview",
      description:
        "See all invoices in one dashboard:",
      benefit:
        "Paid, Unpaid, and Overdue • Monthly/yearly totals • Clear income charts",
      icon: BarChart3,
    },
  ];

  const toggleStep = (index: number) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  return (
    <section className="container mx-auto px-4 py-10">
      <h2 className="mb-10 text-center text-4xl font-bold tracking-tight md:text-5xl">
        How It Works
      </h2>

      {/* Demo video */}
      <div className="mx-auto mb-8 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-md">
          <iframe
            className="aspect-video w-full"
            src="https://www.youtube-nocookie.com/embed/Uoa8XTYokao?rel=0&modestbranding=1"
            title="Invoicingu — Quick demo"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <div className="mt-3 text-center">
          <a
            href="https://youtu.be/Uoa8XTYokao"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm underline text-muted-foreground hover:text-foreground"
          >
            Watch on YouTube
          </a>
        </div>
      </div>

      {/* Accordion */}
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isOpen = expandedStep === index;
          return (
            <Card
              key={step.number}
              onClick={() => toggleStep(index)}
              aria-expanded={isOpen}
              className={[
                "w-full cursor-pointer rounded-2xl border transition shadow-sm",
                isOpen
                  ? "border-border bg-muted/30"
                  : "border-border hover:bg-muted/20",
              ].join(" ")}
            >
              {/* Header */}
              <div className="flex items-start gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-foreground/70 ring-1 ring-border">
                  <Icon className="h-5 w-5" />
                </span>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold md:text-xl">
                    {step.number}. {step.title}
                  </h3>
                </div>

                <ChevronDown
                  className={[
                    "mt-1 h-5 w-5 text-muted-foreground transition-transform duration-300",
                    isOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </div>

              {/* Panel */}
              <div
                className={[
                  "overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out",
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                ].join(" ")}
              >
                <div className="px-5 pb-5 -mt-1 text-left">
                  <p className="mb-2 text-base text-muted-foreground">
                    {step.description}
                  </p>
                  <p className="text-base text-emerald-600">✓ {step.benefit}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
