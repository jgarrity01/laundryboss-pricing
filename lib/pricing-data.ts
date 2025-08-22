export interface PricingData {
  monthlyRecurring: {
    washers: { price: number }
    dryers: { price: number }
    wdfSoftware: { price: number }
    pickupDelivery: { price: number }
    aiAttendant: { price: number }
    aiAttendantWithIntegration: { price: number }
  }
  oneTimeCharges: {
    harnesses: { price: number }
    qrCodes: { price: number; qty: number }
    signPackage: { price: number }
    matterport3D: { price: number }
    installation: { price: number }
    posHardware: { price: number }
    fullNetworkPackage: { price: number }
    additionalBroadcastMIB: { price: number }
    mobileOnlyNetwork: { price: number }
  }
  kioskOptions: {
    rearLoadKiosk: { price: number }
    frontLoadKiosk: { price: number }
    creditBillKiosk: { price: number }
    creditOnlyKiosk: { price: number }
    ebtKioskUpgrade: { price: number }
  }
}

export const pricingData: PricingData = {
  monthlyRecurring: {
    washers: { price: 5.0 },
    dryers: { price: 5.0 },
    wdfSoftware: { price: 100.0 },
    pickupDelivery: { price: 100.0 },
    aiAttendant: { price: 50.0 },
    aiAttendantWithIntegration: { price: 100.0 },
  },
  oneTimeCharges: {
    harnesses: { price: 25.0 },
    qrCodes: { price: 100.0, qty: 2 }, // This will be calculated dynamically based on machine count
    signPackage: { price: 140.0 },
    matterport3D: { price: 350.0 },
    installation: { price: 0 }, // This will be calculated dynamically based on machine count and self-install option
    posHardware: { price: 1975.0 },
    fullNetworkPackage: { price: 1875.0 },
    additionalBroadcastMIB: { price: 175.0 },
    mobileOnlyNetwork: { price: 679.0 },
  },
  kioskOptions: {
    rearLoadKiosk: { price: 9925.0 },
    frontLoadKiosk: { price: 13500.0 },
    creditBillKiosk: { price: 6250.0 },
    creditOnlyKiosk: { price: 2295.0 },
    ebtKioskUpgrade: { price: 0 },
  },
}

export const calculateInstallationCost = (totalMachines: number, selfInstall: boolean): number => {
  if (selfInstall) {
    return 500 // Installation assistance for self-install
  }

  // Full installation service based on machine count
  if (totalMachines <= 40) return 3000
  if (totalMachines <= 60) return 3500
  if (totalMachines <= 80) return 4500
  if (totalMachines <= 100) return 5500
  if (totalMachines <= 120) return 7000
  return 8000 // 120+ machines
}

export const calculateQRCodeCost = (totalMachines: number): { sheets: number; totalCost: number } => {
  const sheetsNeeded = Math.ceil(totalMachines / 20) // 1 sheet per 20 machines
  const pricePerSheet = 110.0 // Updated from 100.0 to 110.0
  return {
    sheets: sheetsNeeded,
    totalCost: sheetsNeeded * pricePerSheet,
  }
}

export const calculatePOSSystemCost = (wantsWashDryFold: boolean, wantsPickupDelivery: boolean): number => {
  // Add POS system cost if either wash dry fold OR pickup delivery is selected
  if (wantsWashDryFold || wantsPickupDelivery) {
    return 3125.0 // Laundry Boss Point of Sale System
  }
  return 0
}
