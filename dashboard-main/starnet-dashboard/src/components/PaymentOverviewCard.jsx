// src/components/PaymentOverviewCard.jsx
import React, { useState, useMemo } from "react";
import { ArrowDownIcon } from "@heroicons/react/24/outline";

export default function PaymentOverviewCard({ data, onClientClick }) {
  const [expandedClient, setExpandedClient] = useState(null);

  // --- Helper functions (unchanged) ---
  const parseDateTime = (dateTimeString) => {
    if (!dateTimeString) return null;
    const parsedDate = new Date(dateTimeString);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const formatDate = (dateTimeString) => {
    const date = parseDateTime(dateTimeString);
    if (!date) return "Invalid Date";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateTimeString) => {
    const date = parseDateTime(dateTimeString);
    if (!date) return "Invalid Time";
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMonthLabel = (month, year) => {
    if (!month || !year) return "Invalid Date";
    return `${month} ${year}`;
  };

  // --- Data processing (unchanged) ---
  const { totalAmount, latestPayments, groupedPayments } = useMemo(() => {
    let totalAmount = 0;
    let groupedPayments = {};
    let latestPayments = {};

    if (Array.isArray(data)) {
      data.forEach((payment) => {
        const { clientName, amount, date_time } = payment;
        totalAmount += Number(amount) || 0;
        if (
          !latestPayments[clientName] ||
          new Date(date_time) >
            new Date(latestPayments[clientName].date_time)
        ) {
          latestPayments[clientName] = payment;
        }
      });
    } else if (typeof data === "object") {
      groupedPayments = data;
      Object.values(data).forEach((payments) => {
        payments.forEach((payment) => {
          const { clientName, amount, date_time } = payment;
          totalAmount += Number(amount) || 0;
          if (
            !latestPayments[clientName] ||
            new Date(date_time) >
              new Date(latestPayments[clientName].date_time)
          ) {
            latestPayments[clientName] = payment;
          }
        });
      });
    }

    return { totalAmount, latestPayments, groupedPayments };
  }, [data]);

  const sortedMonths = Object.keys(groupedPayments).sort((a, b) => {
    const [monthA, yearA] = a.split(" ");
    const [monthB, yearB] = b.split(" ");
    const dateA = new Date(`${monthA} 1, ${yearA}`);
    const dateB = new Date(`${monthB} 1, ${yearB}`);
    return dateB - dateA;
  });

  // --- Render ---
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Payments Overview
        </h2>
        <p className="text-3xl font-bold text-green-600 mt-1 tracking-tight">
          KES {totalAmount.toLocaleString()}
        </p>
      </div>

      {/* No data */}
      {!Array.isArray(data) && sortedMonths.length === 0 && (
        <p className="text-gray-500 text-sm">No payment data available.</p>
      )}

      {/* Grouped months */}
      {!Array.isArray(data) && sortedMonths.length > 0 && (
        <div className="space-y-4">
          {sortedMonths.map((monthKey) => {
            const [month, year] = monthKey.split(" ");
            const monthPayments = groupedPayments[monthKey] || [];
            const isOpen = expandedClient === monthKey;

            return (
              <div
                key={monthKey}
                className="bg-gray-50 rounded-xl shadow-sm overflow-hidden border border-gray-100"
              >
                {/* Month header */}
                <button
                  onClick={() =>
                    setExpandedClient(isOpen ? null : monthKey)
                  }
                  className="flex items-center justify-between w-full p-4 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="text-base font-semibold text-gray-700">
                    {formatMonthLabel(month, year)}
                  </h3>
                  <ArrowDownIcon
                    className={`w-5 h-5 text-gray-500 transform transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Payments list */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen ? "max-h-[800px] animate-accordion-down" : "max-h-0"
                  }`}
                >
                  <ul className="p-4 space-y-2">
                    {monthPayments.map((payment, idx) => (
                      <li
                        key={idx}
                        onClick={() =>
                          onClientClick && onClientClick(payment)
                        }
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {payment.clientName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(payment.date_time)} •{" "}
                            {formatTime(payment.date_time)}
                          </p>
                        </div>
                        <p className="font-semibold text-green-600">
                          KES {Number(payment.amount).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Latest payments (array mode) */}
      {Array.isArray(data) && (
        <div className="space-y-3">
          {Object.values(latestPayments).map((payment, idx) => (
            <div
              key={idx}
              onClick={() => onClientClick && onClientClick(payment)}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div>
                <p className="font-medium text-gray-800">
                  {payment.clientName}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(payment.date_time)} •{" "}
                  {formatTime(payment.date_time)}
                </p>
              </div>
              <p className="font-semibold text-green-600">
                KES {Number(payment.amount).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
