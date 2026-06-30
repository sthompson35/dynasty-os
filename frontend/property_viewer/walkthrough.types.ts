export type WalkthroughStop = {
  stop_index: number;
  stop_code: string;
  name: string;
  room_code?: string;
  position_ft: [number, number, number];
  look_at_ft: [number, number, number];
};

export type WalkthroughManifest = {
  property_id: string;
  model_url: string;
  coordinate_system: string;
  eye_height_ft: number;
  stops: WalkthroughStop[];
};
