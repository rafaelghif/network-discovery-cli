export class Neighbor {
  constructor(
    public localPort: string,
    public deviceId: string,
    public portId: string,
    public platform?: string
  ) {}
}