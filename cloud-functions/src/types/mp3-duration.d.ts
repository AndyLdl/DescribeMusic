declare module 'mp3-duration' {
    function mp3Duration(filePath: string | Buffer, callback: (err: Error | null, duration: number) => void): void;
    export = mp3Duration;
}

declare module 'node-id3' {
    interface ID3Tags {
        title?: string;
        artist?: string;
        album?: string;
        year?: string;
        genre?: string;
        [key: string]: any;
    }

    export function read(buffer: Buffer | string): ID3Tags;
    export function write(tags: ID3Tags, file: string | Buffer): boolean;
    export function update(tags: ID3Tags, file: string | Buffer): boolean;
    export function create(tags: ID3Tags): Buffer;
}