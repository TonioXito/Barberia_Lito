import { useState, useEffect } from "react";
import {
  onProducts,
  onClients,
  onSales,
  onMovements,
  onCreditSales,
  onCreditPayments,
} from "../firebase/services";

export function useCollection(subscribe, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let unsub = null;
    const onError = (err) => {
      setError(err);
      setLoading(false);
    };
    try {
      unsub = subscribe(setData, onError);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function useProducts() {
  return useCollection(onProducts);
}

export function useClients() {
  return useCollection(onClients);
}

export function useSales() {
  return useCollection((cb, onErr) => onSales(cb, { limit: 500 }, onErr));
}

export function useMovements() {
  return useCollection((cb, onErr) => onMovements(cb, 200, onErr));
}

export function useCreditSales() {
  return useCollection(onCreditSales);
}

export function useCreditPayments() {
  return useCollection(onCreditPayments);
}