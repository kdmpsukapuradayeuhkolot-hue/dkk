<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'date',
        'customer_id',
        'customer_snapshot',
        'subtotal',
        'total',
        'payment_type',
        'cash_received',
        'change_due',
        'receipt_no',
    ];

    protected $casts = [
        'date' => 'datetime',
        'customer_snapshot' => 'array',
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'cash_received' => 'decimal:2',
        'change_due' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(TransactionItem::class);
    }
}
