<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class WholesaleTransactionController extends Controller
{
    public function index()
    {
        $products = Product::where('archived', false)
            ->where('stock_qty', '>', 0)
            ->take(20)
            ->get();

        $customers = Customer::where('archived', false)->get();

        return view('pos.wholesale-transaction', [
            'products' => $products,
            'customers' => $customers,
            'type' => 'WHOLESALE',
        ]);
    }

    public function searchProducts(Request $request)
    {
        $searchTerm = $request->get('search', '');

        $products = Product::where('archived', false)
            ->where('stock_qty', '>', 0)
            ->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                  ->orWhere('code', 'like', '%' . $searchTerm . '%');
            })
            ->get();

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'cash_received' => 'required|numeric|min:0',
        ]);

        $items = $request->items;
        $subtotal = 0;
        $transactionItems = [];

        DB::transaction(function () use ($request, $items, &$subtotal, &$transactionItems) {
            foreach ($items as $item) {
                $product = Product::findOrFail($item['product_id']);

                if ($product->stock_qty < $item['qty']) {
                    throw new \Exception("Insufficient stock for {$product->name}");
                }

                $unitPrice = $product->wholesale_price ?? $product->retail_price;
                $lineTotal = $unitPrice * $item['qty'];
                $subtotal += $lineTotal;

                $transactionItems[] = new TransactionItem([
                    'product_id' => $product->id,
                    'code' => $product->code,
                    'name' => $product->name,
                    'unit_price' => $unitPrice,
                    'qty' => $item['qty'],
                    'line_total' => $lineTotal,
                ]);

                $product->decrement('stock_qty', $item['qty']);
            }

            $customer = null;
            $customerSnapshot = null;
            if ($request->customer_id) {
                $customer = Customer::findOrFail($request->customer_id);
                $customer->increment('total_transactions');
                $customerSnapshot = [
                    'member_no' => $customer->member_no,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'address' => $customer->address,
                ];
            }

            $transaction = Transaction::create([
                'type' => 'WHOLESALE',
                'date' => Carbon::now(),
                'customer_id' => $request->customer_id,
                'customer_snapshot' => $customerSnapshot,
                'subtotal' => $subtotal,
                'total' => $subtotal,
                'payment_type' => 'CASH',
                'cash_received' => $request->cash_received,
                'change_due' => $request->cash_received - $subtotal,
                'receipt_no' => 'TX-' . time(),
            ]);

            $transaction->items()->saveMany($transactionItems);
        });

        return response()->json(['success' => true]);
    }
}
