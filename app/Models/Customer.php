<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_no',
        'name',
        'phone',
        'address',
        'photo_file_id',
        'archived',
        'total_transactions',
    ];

    protected $casts = [
        'archived' => 'boolean',
        'total_transactions' => 'integer',
    ];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
