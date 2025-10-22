export type TileMeta = {
  id: number;
  value: number;
  position: [number, number];
  fromPosition?: [number, number];
  mergeWith?: number;
};

export type State = {
  tiles: {
    [id: number]: TileMeta; // dictionnaire des tuiles par ID
  };
  byIds: number[]; // ordre des tuiles à afficher
  inMotion: boolean; // une animation est en cours ?
  hasChanged: boolean; // le dernier tour a-t-il modifié l'état ?
};

export type Action =
  | { type: "CREATE_TILE"; tile: TileMeta }
  | { type: "UPDATE_TILE"; tile: TileMeta }
  | { type: "MERGE_TILE"; source: TileMeta; destination: TileMeta }
  | { type: "START_MOVE" }
  | { type: "END_MOVE" }
  | { type: "RESET_GAME" };

export const initialState: State = {
  tiles: {},
  byIds: [],
  hasChanged: false,
  inMotion: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "CREATE_TILE": {
      const { tile } = action;

      return {
        ...state,
        tiles: {
          ...state.tiles,
          [tile.id]: tile,
        },
        byIds: [...state.byIds, tile.id],
      };
    }
    case "START_MOVE": {
      return {
        ...state,
        inMotion: true,
      };
    }
    case "END_MOVE": {
      return {
        ...state,
        inMotion: false,
        hasChanged: false,
      };
    }
    case "UPDATE_TILE": {
      const { tile } = action;

      return {
        ...state,
        tiles: {
          ...state.tiles,
          [tile.id]: tile,
        },
        hasChanged: true,
      };
    }
    case "MERGE_TILE": {
      const { source, destination } = action;

      const {
        [source.id]: _,
        [destination.id]: __,
        ...restTiles
      } = state.tiles;

      return {
        ...state,
        tiles: {
          ...restTiles,
          [destination.id]: {
            id: destination.id,
            value: source.value + destination.value,
            position: destination.position,
          },
        },
        byIds: state.byIds.filter((id) => id !== source.id),
        hasChanged: true,
      };
    }
    case "RESET_GAME": {
      return initialState;
    }

    default:
      return state;
  }
}
