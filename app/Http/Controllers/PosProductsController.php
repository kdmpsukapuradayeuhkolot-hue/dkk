<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;

class PosProductsController extends Controller
{
    public function index(Request $request)
    {
        $searchTerm = $request->get('search', '');

        $query = Product::where('archived', false);

        if ($searchTerm) {
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                  ->orWhere('code', 'like', '%' . $searchTerm . '%');
            });
        }

        $products = $query->paginate(20);

        return view('pos.products', [
            'products' => $products,
            'searchTerm' => $searchTerm,
        ]);
    }
}
