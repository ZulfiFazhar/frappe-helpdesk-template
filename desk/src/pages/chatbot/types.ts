export interface TicketRecommendation {
  subject: string
  description: string
  priority: "Low" | "Medium" | "High"
  category: string
  customer: string
}
