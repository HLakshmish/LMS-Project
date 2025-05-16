export const hasExamStarted = (startDateTime: string): boolean => {
  return new Date(startDateTime) <= new Date();
};

export const hasExamEnded = (endDateTime: string): boolean => {
  return new Date(endDateTime) <= new Date();
}; 