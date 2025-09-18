<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PosDashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $start = Carbon::today();
        $end = Carbon::today()->endOfDay();

        $transactionsToday = Transaction::whereBetween('date', [$start, $end])->with('items')->get();

        $itemAgg = [];

        foreach ($transactionsToday as $transaction) {
            foreach ($transaction->items as $item) {
                if (!isset($itemAgg[$item->product_id])) {
                    $itemAgg[$item->product_id] = [
                        'name' => $item->name,
                        'qty' => 0,
                        'revenue' => 0,
                    ];
                }
                $itemAgg[$item->product_id]['qty'] += $item->qty;
                $itemAgg[$item->product_id]['revenue'] += $item->line_total;
            }
        }

        $topSellingProducts = collect($itemAgg)->sortByDesc('qty')->take(5);

        return view('pos.dashboard', [
            'user' => $user,
            'topSellingProducts' => $topSellingProducts,
        ]);
    }
}
