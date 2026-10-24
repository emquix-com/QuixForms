import { parseForm, registry, type Field, type Form } from "./index";
export const templateCatalog = [
  {
    id: "blank",
    name: "Blank form",
    description: "Start with your own fields.",
  },
  {
    id: "contact",
    name: "Simple Contact Form",
    description: "Name, email and a message.",
  },
  {
    id: "advanced_contact",
    name: "Advanced Contact Form",
    description: "Contact details and conditional company information.",
  },
  {
    id: "newsletter",
    name: "Newsletter Signup",
    description: "Email and explicit subscription consent.",
  },
  {
    id: "quote",
    name: "Request a Quote",
    description: "Services, budget and project details.",
  },
  {
    id: "job",
    name: "Job Application",
    description:
      "Applicant details and experience. File uploads are not included.",
  },
  {
    id: "event",
    name: "Event Registration",
    description: "Attendee details and ticket preference. No payments.",
  },
  {
    id: "appointment",
    name: "Appointment Request",
    description: "Preferred time as text and contact details.",
  },
  {
    id: "feedback",
    name: "Customer Feedback",
    description: "Satisfaction choices and comments.",
  },
  {
    id: "support",
    name: "Support Request",
    description: "Product, priority and issue details.",
  },
  {
    id: "product",
    name: "Product Inquiry",
    description: "Product interest and questions.",
  },
  {
    id: "lead",
    name: "Lead Generation",
    description: "Business details and contact consent.",
  },
  {
    id: "multistep",
    name: "Multi-Step Inquiry",
    description: "Contact, project and consent across three steps.",
  },
  {
    id: "business",
    name: "Business Registration",
    description: "Organization, website and contact details.",
  },
  {
    id: "service",
    name: "Service Request",
    description: "Service selection and requested work.",
  },
  {
    id: "volunteer",
    name: "Volunteer Application",
    description: "Interests, availability and contact details.",
  },
] as const;
export type TemplateId = (typeof templateCatalog)[number]["id"];
function field(
  type: Field["type"],
  id: string,
  label: string,
  required = false,
  options?: string[],
): Field {
  return {
    ...registry[type].create(id),
    label,
    required,
    ...(options ? { options } : {}),
  };
}
export function createTemplate(
  templateId: TemplateId,
  id: string,
  title?: string,
): Form {
  const metadata = templateCatalog.find((t) => t.id === templateId);
  if (!metadata) throw new Error("Unknown template");
  const contact = () => [
    field("name", "name", "Your name", true),
    field("email", "email", "Email address", true),
  ];
  const message = () => field("paragraph", "message", "How can we help?", true);
  const consent = () =>
    field(
      "consent",
      "consent",
      "I agree to be contacted about this request",
      true,
    );
  let fields: Field[] = [];
  switch (templateId) {
    case "blank":
      break;
    case "contact":
      fields = [...contact(), message()];
      break;
    case "advanced_contact":
      fields = [
        ...contact(),
        field("phone", "phone", "Phone"),
        field("select", "kind", "Inquiry type", true, ["Personal", "Business"]),
        {
          ...field("text", "company", "Company", true),
          showWhen: { field: "kind", op: "eq", value: "Business" },
        },
        message(),
      ];
      break;
    case "newsletter":
      fields = [
        field("email", "email", "Email address", true),
        field("name", "name", "Your name"),
        field("consent", "consent", "I want to receive the newsletter", true),
      ];
      break;
    case "quote":
      fields = [
        ...contact(),
        field("url", "website", "Current website"),
        field("checkboxes", "services", "Services", true, [
          "Design",
          "Development",
          "Maintenance",
        ]),
        field("number", "budget", "Budget estimate"),
        message(),
        consent(),
      ];
      break;
    case "job":
      fields = [
        ...contact(),
        field("text", "position", "Position", true),
        field("url", "portfolio", "Portfolio URL"),
        field("paragraph", "experience", "Relevant experience", true),
        consent(),
      ];
      break;
    case "event":
      fields = [
        ...contact(),
        field("select", "ticket", "Attendance", true, ["In person", "Online"]),
        field(
          "paragraph",
          "requirements",
          "Accessibility or dietary requirements",
        ),
      ];
      break;
    case "appointment":
      fields = [
        ...contact(),
        field("text", "time", "Preferred date and time", true),
        field("text", "timezone", "Your time zone", true),
        message(),
      ];
      break;
    case "feedback":
      fields = [
        field("radio", "satisfaction", "How satisfied are you?", true, [
          "Very satisfied",
          "Satisfied",
          "Neutral",
          "Dissatisfied",
        ]),
        field("paragraph", "comments", "What could we improve?"),
      ];
      break;
    case "support":
      fields = [
        ...contact(),
        field("text", "product", "Product", true),
        field("select", "priority", "Priority", true, ["Normal", "High"]),
        field("paragraph", "issue", "Describe the issue", true),
      ];
      break;
    case "product":
      fields = [
        ...contact(),
        field("text", "product", "Product of interest", true),
        message(),
      ];
      break;
    case "lead":
      fields = [
        ...contact(),
        field("text", "company", "Company"),
        field("select", "interest", "Interested in", true, [
          "Consultation",
          "Services",
          "Partnership",
        ]),
        consent(),
      ];
      break;
    case "multistep":
      fields = [
        ...contact(),
        field("page", "project_page", "Project details"),
        field("text", "company", "Company"),
        message(),
        field("page", "confirm_page", "Consent"),
        consent(),
      ];
      break;
    case "business":
      fields = [
        field("text", "company", "Organization name", true),
        field("url", "website", "Website"),
        ...contact(),
        consent(),
      ];
      break;
    case "service":
      fields = [
        ...contact(),
        field("select", "service", "Service", true, [
          "Consultation",
          "Implementation",
          "Support",
        ]),
        message(),
      ];
      break;
    case "volunteer":
      fields = [
        ...contact(),
        field("checkboxes", "interests", "Areas of interest", true, [
          "Events",
          "Outreach",
          "Administration",
        ]),
        field("text", "availability", "Availability", true),
        consent(),
      ];
      break;
  }
  return parseForm({
    schemaVersion: 1,
    id,
    title: title ?? metadata.name,
    status: "draft",
    fields,
    confirmation: "Thank you. Your response has been received.",
  });
}
