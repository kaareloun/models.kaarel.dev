import { validateModelsDevResponse } from "./validation";

export function parseData(data: unknown) {
  const parsedData = validateModelsDevResponse.parse(data);

  return Object.entries(parsedData)
    .map(([_, providerData]) => {
      return Object.entries(providerData.models).map(([_, modelData]) => {
        return {
          ...modelData,
          providerId: providerData.id,
          providername: providerData.name,
        };
      });
    })
    .flat()
    .filter((model, index, self) => {
      return self.findIndex((m) => m.id === model.id) === index;
    })
    .sort((a, b) => {
      const aDate = new Date(a.release_date);
      const bDate = new Date(b.release_date);

      if (aDate < bDate) {
        return 1;
      }

      if (aDate > bDate) {
        return -1;
      }

      return 0;
    });
}
