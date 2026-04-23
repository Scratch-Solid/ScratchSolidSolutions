// AI Assistant Responses Data
// This will be replaced with Directus integration later

export interface AIResponse {
  id: number;
  question: string;
  response: string;
}

export const defaultAIResponses: AIResponse[] = [
  { 
    id: 1, 
    question: "What services do you offer?", 
    response: "We offer professional cleaning services for homes and businesses starting from R350 per service. Our services include regular cleaning, deep cleaning, and specialized cleaning solutions." 
  },
  { 
    id: 2, 
    question: "How do I book a service?", 
    response: "You can book through our website by clicking the 'Book a cleaner' button, or contact us directly via WhatsApp at +27 69 673 5947. Our team will help you find the perfect cleaning solution for your needs." 
  },
  { 
    id: 3, 
    question: "Are your cleaners insured?", 
    response: "Yes, all our cleaners are fully insured and professionally trained. We conduct thorough background checks and ensure our team meets the highest standards of quality and reliability." 
  },
  { 
    id: 4, 
    question: "What areas do you service?", 
    response: "We currently service the greater Johannesburg area. If you're unsure about your location, please contact us and we'll be happy to discuss service availability in your area." 
  },
  { 
    id: 5, 
    question: "How much does it cost?", 
    response: "Our services start from R350 per service, with pricing varying based on the size of your space and specific requirements. Contact us for a personalized quote tailored to your needs." 
  }
];

// Mock function to get AI response based on user input
export function getAIResponse(userInput: string): string {
  const input = userInput.toLowerCase();
  
  // Check for exact matches first
  for (const response of defaultAIResponses) {
    if (input.includes(response.question.toLowerCase())) {
      return response.response;
    }
  }
  
  // Check for keyword matches
  if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
    return defaultAIResponses[4].response; // Cost response
  }
  
  if (input.includes('book') || input.includes('appointment') || input.includes('schedule')) {
    return defaultAIResponses[1].response; // Booking response
  }
  
  if (input.includes('service') || input.includes('offer') || input.includes('clean')) {
    return defaultAIResponses[0].response; // Services response
  }
  
  if (input.includes('insure') || input.includes('insurance') || input.includes('safe')) {
    return defaultAIResponses[2].response; // Insurance response
  }
  
  if (input.includes('area') || input.includes('location') || input.includes('where')) {
    return defaultAIResponses[3].response; // Area response
  }
  
  // Default response
  return "Thank you for your question! Our team offers professional cleaning services starting from R350. You can book a service through our website or contact us via WhatsApp at +27 69 673 5947. Is there anything specific about our cleaning services you'd like to know more about?";
}
