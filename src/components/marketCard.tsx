import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contract";
import { MarketProgress } from "./market-progress";
import { MarketTime } from "./market-time";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { MarketResolved } from "./market-resolved";
import { MarketPending } from "./market-pending";
import { MarketBuyInterface } from "./market-buy-interface";
import { MarketSharesDisplay } from "./market-shares-display";

// Props for the MarketCard component
// index is the market id
// filter is the filter to apply to the market
interface MarketCardProps {
  index: number;
  filter: "active" | "pending" | "resolved";
  category: string;
}

// Interface for the market data
interface Market {
  question: string;
  category: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

// Interface for the shares balance
interface SharesBalance {
  optionAShares: bigint;
  optionBShares: bigint;
}

export function MarketCard({ index, filter, category }: MarketCardProps) {
  // Get the active account
  const account = useActiveAccount();

  // Get the market data
  const { data: marketData, isLoading: isLoadingMarketData } = useReadContract({
    contract,
    method:
      "function getMarketInfo(uint256 _marketId) view returns (string question, string category, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
    //   "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
    params: [BigInt(index)],
  });

  // Parse the market data
  const market: Market | undefined = marketData
    ? {
        question: marketData[0],
        category: marketData[1],
        optionA: marketData[2],
        optionB: marketData[3],
        endTime: marketData[4],
        outcome: marketData[5],
        totalOptionAShares: marketData[6],
        totalOptionBShares: marketData[7],
        resolved: marketData[8],
      }
    : undefined;

  // Get the shares balance
  const { data: sharesBalanceData } = useReadContract({
    contract,
    method:
      "function getSharesBalance(uint256 _marketId, address _user) view returns (uint256 OptionAShares, uint256 optionBShares)",
    params: [BigInt(index), account?.address as string],
  });

  // Parse the shares balance
  const sharesBalance: SharesBalance | undefined = sharesBalanceData
    ? {
        optionAShares: sharesBalanceData[0],
        optionBShares: sharesBalanceData[1],
      }
    : undefined;

  // Check if the market is expired
  const isExpired = new Date(Number(market?.endTime) * 1000) < new Date();
  // Check if the market is resolved
  const isResolved = market?.resolved;
  const market_category = market?.category;

  // Check if the market should be shown
  const shouldShow = () => {
    if (!market) return false;
    switch (filter) {
      case "active":
        return (
          !isExpired &&
          (category == "all markets" || category == market_category)
        );
      case "pending":
        return (
          isExpired &&
          !isResolved &&
          (category == "all markets" || category == market_category)
        );
      case "resolved":
        return (
          isExpired &&
          isResolved &&
          (category == "all markets" || category == market_category)
        );
      default:
        return true;
    }
  };

  // If the market should not be shown, return null
  if (!shouldShow()) {
    return null;
  }

  return (
    <Card key={index} className="flex flex-col">
      {isLoadingMarketData ? (
        <MarketCardSkeleton />
      ) : (
        <>
          <CardHeader>
            {market && <MarketTime endTime={market.endTime} />}
            <CardTitle>{market?.question}</CardTitle>
          </CardHeader>
          <CardContent>
            {market && (
              <MarketProgress
                optionA={market.optionA}
                optionB={market.optionB}
                totalOptionAShares={market.totalOptionAShares}
                totalOptionBShares={market.totalOptionBShares}
              />
            )}
            {new Date(Number(market?.endTime) * 1000) < new Date() ? (
              market?.resolved ? (
                <MarketResolved
                  marketId={index}
                  outcome={market.outcome}
                  optionA={market.optionA}
                  optionB={market.optionB}
                  sharesbalance={sharesBalance}
                />
              ) : (
                <MarketPending />
              )
            ) : (
              <MarketBuyInterface marketId={index} market={market!} />
            )}
          </CardContent>
          <CardFooter>
            {market && sharesBalance && (
              <MarketSharesDisplay
                market={market}
                sharesBalance={sharesBalance}
              />
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
