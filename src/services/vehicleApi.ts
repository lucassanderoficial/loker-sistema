interface VehicleApiResponse {
  brand: string;
  model: string;
  year: number;
  color?: string;
  chassis?: string;
  renavam?: string;
}

export async function fetchVehicleData(plate: string): Promise<VehicleApiResponse> {
  try {
    const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simula delay da rede
    
    const mockData: Record<string, VehicleApiResponse> = {
      'ABC1D23': {
        brand: 'TOYOTA',
        model: 'COROLLA',
        year: 2022,
        color: 'PRATA',
        chassis: '9BRBL3HE1P0123456',
        renavam: '12345678901'
      },
      'DEF2G45': {
        brand: 'HONDA',
        model: 'CIVIC',
        year: 2023,
        color: 'PRETO',
        chassis: '93HGK5660PS789012',
        renavam: '98765432109'
      },
      'GHI3J67': {
        brand: 'JEEP',
        model: 'COMPASS',
        year: 2024,
        color: 'BRANCO',
        chassis: '988AD9B06PK345678',
        renavam: '45678901234'
      }
    };

    if (mockData[cleanPlate]) {
      return mockData[cleanPlate];
    }

    throw new Error(`Veículo com placa ${plate} não encontrado na base de dados.`);

    /* IMPLEMENTAÇÃO REAL - Descomente e configure quando tiver a API
    const response = await fetch(`https://api.exemplo.com/v1/vehicles/${cleanPlate}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Veículo não encontrado. Verifique a placa e tente novamente.');
      }
      throw new Error('Erro ao consultar os dados do veículo.');
    }

    const data = await response.json();
    return {
      brand: data.marca,
      model: data.modelo,
      year: parseInt(data.ano),
      color: data.cor,
      chassis: data.chassi,
      renavam: data.renavam
    };
    */
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao consultar os dados do veículo.';
    console.error('Erro ao buscar dados do veículo:', errorMessage);
    throw new Error(errorMessage);
  }
}