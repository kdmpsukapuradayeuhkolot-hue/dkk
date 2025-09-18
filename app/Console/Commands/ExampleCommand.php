<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ExampleCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'example:run {--name= : The name to greet}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Example Artisan command for demonstration';

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
        $name = $this->option('name') ?? 'World';

        $this->info("Hello, {$name}! This is an example Artisan command.");
        $this->comment('Command executed successfully.');

        return Command::SUCCESS;
    }
}
