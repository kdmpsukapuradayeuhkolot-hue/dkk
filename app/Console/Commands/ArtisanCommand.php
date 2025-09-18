<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ArtisanCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'artisan:input {name : The name to process} {--uppercase : Convert to uppercase}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process input with Artisan command';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $name = $this->argument('name');

        if ($this->option('uppercase')) {
            $name = strtoupper($name);
        }

        $this->info("Processed input: {$name}");
        $this->comment('Artisan command executed successfully.');

        return Command::SUCCESS;
    }
}
