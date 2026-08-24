export interface FoundationReadiness {
  framework: "React";
  language: "TypeScript";
  migrationMode: "island";
}

export function getFoundationReadiness(): FoundationReadiness {
  return {
    framework: "React",
    language: "TypeScript",
    migrationMode: "island",
  };
}
