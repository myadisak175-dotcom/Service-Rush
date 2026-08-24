export interface GameEventMap extends Record<string, unknown> {
  customerGroupSpawned: { groupId: string; size: number };
  customerGroupSeated: { groupId: string; tableId: string };
  menuDelivered: { tableId: string };
  customerReadyToOrder: { tableId: string };
  orderSubmitted: { tableId: string; orderId: string };
  foodReady: { orderId: string; itemId: string };
  foodServed: { orderId: string; itemId: string; tableId: string };
  paymentCollected: { tableId: string; amount: number };
  serviceWindowResolved: {
    tableId: string;
    action: string;
    rating: 'perfect' | 'great' | 'ok' | 'late';
  };
}
