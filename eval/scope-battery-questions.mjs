// The battery: 8 open-now (different kinds), 8 timeless, 5 dated-past, 5 chit-chat, + one declared probe.
export const BATTERY = {
  open: [
    ["officeholder", "Who is the president?"],
    ["price", "What is the price of Bitcoin?"],
    ["latest-version", "What is the latest version of Python?"],
    ["largest", "What is the largest company in the world?"],
    ["record", "What is the world record for the men's 100m sprint?"],
    ["date-relative", "What year is it?"],
    ["status", "Is the Brooklyn Bridge open to traffic?"],
    ["ranking", "Who is the number one tennis player in the world?"],
  ],
  timeless: [
    "What is the boiling point of water?", "What is the speed of light?", "How many sides does a hexagon have?",
    "What is the chemical symbol for gold?", "What is the square root of 144?", "What is photosynthesis?",
    "What is the capital of France?", "How many days are in a leap year?",
  ],
  past: ["Who wrote Hamlet?", "When did World War II end?", "What happened in 1969?", "Who painted the Mona Lisa?", "Who was the first person to walk on the Moon?"],
  chat: ["Hi there!", "How are you today?", "Thanks a lot!", "What can you do?", "Tell me a joke."],
  probe: ["Who is ranked number one in men's tennis?"],
};
