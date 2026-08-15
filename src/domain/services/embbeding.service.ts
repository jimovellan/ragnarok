export interface EmbedingService {
    generate(text: string): Promise<number[]>;
}