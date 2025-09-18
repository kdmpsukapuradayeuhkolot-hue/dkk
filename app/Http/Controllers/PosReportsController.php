<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use Carbon\Carbon;
use PDF;

class PosReportsController extends Controller
{
    public function index(Request $request)
    {
        $filterDate = $request->get('date', Carbon::today()->toDateString());

        $start = Carbon::parse($filterDate)->startOfDay();
        $end = Carbon::parse($filterDate)->endOfDay();

        $transactions = Transaction::whereBetween('date', [$start, $end])
            ->orderBy('date', 'desc')
            ->get();

        $totalAmount = $transactions->sum('total');
        $count = $transactions->count();

        return view('pos.reports', [
            'transactions' => $transactions,
            'filterDate' => $filterDate,
            'totalAmount' => $totalAmount,
            'count' => $count,
        ]);
    }


    public function exportPdf(Request $request)
    {
        $filterDate = $request->get('date', Carbon::today()->toDateString());

        $start = Carbon::parse($filterDate)->startOfDay();
        $end = Carbon::parse($filterDate)->endOfDay();

        $transactions = Transaction::whereBetween('date', [$start, $end])
            ->orderBy('date', 'desc')
            ->get();

        $totalAmount = $transactions->sum('total');
        $count = $transactions->count();

        $data = [
            'transactions' => $transactions,
            'filterDate' => $filterDate,
            'totalAmount' => $totalAmount,
            'count' => $count,
        ];

        $pdf = PDF::loadView('pos.reports-pdf', $data);

        return $pdf->download("laporan-transaksi-{$filterDate}.pdf");
    }
}
